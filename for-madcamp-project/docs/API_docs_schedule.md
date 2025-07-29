## **API 31: 일정 리스트 불러오기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 분반에 속한 모든 일정의 간략한 목록을 불러옵니다. |
| Method | GET |
| URL | /api/classes/{classId}/schedules |
| 인증 | **필수 (JWT)**. 요청 헤더에 `Authorization: Bearer {accessToken}`을 포함해야 합니다. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | classId | Integer | 정보를 조회할 분반의 고유 ID | Y |

### **3. 응답 (Response)**

- **성공 시 (200 OK)**

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| schedules | Array | 해당 분반의 모든 일정 객체 배열 |
| schedule.scheduleId | Integer | 일정 고유 ID |
| schedule.scheduleName | String | 일정 이름 |
| schedule.when | Datetime | 일정이 예정된 시간 |
| schedule.until | Datetime | 일정 종료 시간 (null 가능) |
| schedule.participantCount | Integer | 해당 일정의 총 참여자 수 |
| schedule.myStatus | String | 요청을 보낸 유저의 참여 상태 ('참석', '불참', '미정', '주최자', null) |

```json
{
  "schedules": [
    {
      "scheduleId": 501,
      "scheduleName": "1주차 프로젝트 최종 발표",
      "when": "2024-08-02T16:00:00Z",
      "until": "2024-08-02T17:30:00Z",
      "participantCount": 22,
      "myStatus": "참석"
    },
    {
      "scheduleId": 502,
      "scheduleName": "네트워킹 데이",
      "when": "2024-08-04T19:00:00Z",
      "until": null,
      "participantCount": 15,
      "myStatus": "미정"
    }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 요청한 유저가 해당 분반 소속이 아님 | `{"error": "Access denied."}` |
| 404 Not Found | 해당 `classId`를 가진 분반이 존재하지 않음 | `{"error": "Class not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 32: 자세한 일정 정보 불러오기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 일정의 참여자 목록을 포함한 모든 상세 정보를 불러옵니다. |
| Method | GET |
| URL | /api/schedules/{scheduleId} |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | scheduleId | Integer | 조회할 일정의 고유 ID | Y |

### **3. 응답 (Response)**

- **성공 시 (200 OK)**

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| scheduleId | Integer | 일정 고유 ID |
| scheduleName | String | 일정 이름 |
| when | Datetime | 일정이 예정된 시간 |
| until | Datetime | 일정 종료 시간 (null 가능) |
| description | String | 일정 상세 설명 |
| createdAt | Datetime | 일정이 생성된 시간 |
| relatedPollId | Integer / Null | 연관된 투표 ID (없으면 null) |
| participants | Array | 참여자 정보 객체 배열 |
| participant.userId | Integer | 참여자 유저 ID |
| participant.name | String | 참여자 이름 |
| participant.role | String | 역할 ('주최자', '참여자') |
| participant.status | String | 참여 상태 ('참석', '불참', '미정') |

```json
{
  "scheduleId": 501,
  "scheduleName": "1주차 프로젝트 최종 발표",
  "when": "2024-08-02T16:00:00Z",
  "until": "2024-08-02T17:30:00Z",
  "description": "각 팀별 1주차 프로젝트 결과물을 발표하고 피드백을 공유하는 시간입니다.",
  "createdAt": "2024-07-28T10:00:00Z",
  "relatedPollId": null,
  "participants": [
    {
      "userId": 1,
      "name": "홍길동",
      "role": "주최자",
      "status": "참석"
    },
    {
      "userId": 2,
      "name": "김철수",
      "role": "참여자",
      "status": "참석"
    },
    {
      "userId": 5,
      "name": "이영희",
      "role": "참여자",
      "status": "불참"
    }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 해당 일정을 볼 권한이 없음 (다른 분반의 일정) | `{"error": "Access denied."}` |
| 404 Not Found | 해당 `scheduleId`를 가진 일정이 존재하지 않음 | `{"error": "Schedule not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 33: 일정 만들기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 새로운 일정을 생성합니다. 생성자는 자동으로 '주최자'로 등록됩니다. |
| Method | POST |
| URL | /api/schedules |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Body | scheduleName | String | 생성할 일정의 이름 | Y |
| Body | when | Datetime | 일정이 예정된 시간 | Y |
| Body | until | Datetime | 일정 종료 시간 (선택 사항) | N |
| Body | description | String | 일정 상세 설명 | Y |
| Body | participantIds | Array of Integers | 함께 초대할 참여자들의 유저 ID 배열 (선택 사항) | N |

*일정 생성자 및 분반 정보는 인증 토큰에서 추출하여 사용합니다.*

```json
{
  "scheduleName": "코드 리뷰 스터디 첫 모임",
  "when": "2024-08-05T19:00:00Z",
  "until": "2024-08-05T20:30:00Z",
  "description": "희망자에 한해 코드 리뷰 스터디를 진행합니다. 첫 모임에서는 앞으로의 스터디 방향에 대해 논의합니다.",
  "participantIds": [2, 5, 8]
}
```

### **3. 응답 (Response)**

- **성공 시 (201 Created)**
    - 생성된 일정의 상세 정보를 반환합니다.

```json
{
  "scheduleId": 503,
  "scheduleName": "코드 리뷰 스터디 첫 모임",
  "when": "2024-08-05T19:00:00Z",
  "until": "2024-08-05T20:30:00Z",
  "description": "...",
  "createdAt": "2024-07-30T15:00:00Z",
  "relatedPollId": null,
  "participants": [
    { "userId": 1, "name": "홍길동", "role": "주최자", "status": "참석" },
    { "userId": 2, "name": "김철수", "role": "참여자", "status": "미정" },
    { "userId": 5, "name": "이영희", "role": "참여자", "status": "미정" },
    { "userId": 8, "name": "박보검", "role": "참여자", "status": "미정" }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | 필수 필드 누락 또는 날짜 형식이 잘못됨 | `{"error": "Invalid request body."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 34: 일정 관리하기 (수정/삭제)**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | **주최자**가 일정의 정보를 수정(PUT)하거나 일정 자체를 삭제(DELETE)합니다. |
| Method | PUT, DELETE |
| URL | /api/schedules/{scheduleId} |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

### **2.1. 일정 수정 (PUT)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | scheduleId | Integer | 수정할 일정의 고유 ID | Y |
| Body | scheduleName | String | 수정할 일정 이름 | N |
| Body | when | Datetime | 수정할 예정 시간 | N |
| Body | until | Datetime | 수정할 종료 시간 | N |
| Body | description | String | 수정할 상세 설명 | N |

```json
{
  "scheduleName": "1주차 프로젝트 최종 발표 및 회고",
  "until": "2024-08-02T18:00:00Z",
  "description": "발표 이후, 1주차 프로젝트 진행 과정에 대한 간단한 회고 시간을 갖습니다."
}
```

### **2.2. 일정 삭제 (DELETE)**

*요청 Body가 필요 없습니다.*

### **3. 응답 (Response)**

### **3.1. 일정 수정 성공 시 (200 OK)**

- 수정이 완료된 일정의 상세 정보를 반환합니다. (API 14 응답 형식과 동일)

### **3.2. 일정 삭제 성공 시 (204 No Content)**

- 응답 Body가 없습니다.

### **3.3. 실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | (PUT) 요청 본문이 비어있거나 형식이 잘못됨 | `{"error": "Invalid request body."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 일정의 주최자가 아님 | `{"error": "You are not the creator of this schedule."}` |
| 404 Not Found | `scheduleId`가 존재하지 않음 | `{"error": "Schedule not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 35: 일정 참여 상태 변경하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 일정에 대한 자신의 참여 상태('참석', '불참', '미정')를 변경합니다. 기존 참여자가 아니어도 이 API를 통해 새로 참여할 수 있습니다. |
| Method | PUT |
| URL | /api/schedules/{scheduleId}/participants/me |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | scheduleId | Integer | 참여할 일정의 고유 ID | Y |
| Body | status | String | 변경할 참여 상태 ('참석', '불참', '미정') | Y |

*상태를 변경할 유저 정보는 `participants/me`를 통해 인증 토큰에서 자동으로 인식합니다.*

```json
{
  "status": "참석"
}
```

### **3. 응답 (Response)**

- **성공 시 (200 OK)**
    - 상태 변경이 완료되었음을 알리는 메시지를 반환합니다.

```json
{
  "message": "Your participation status has been updated successfully.",
  "scheduleId": 502,
  "myStatus": "참석"
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | `status` 값이 없거나 유효하지 않은 값임 | `{"error": "Invalid status value. Must be one of '참석', '불참', '미정'."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 주최자는 참여 상태를 '불참'이나 '미정'으로 바꿀 수 없음 (정책에 따라 적용) | `{"error": "The creator cannot change their status from 'attending'."}` |
| 404 Not Found | `scheduleId`가 존재하지 않음 | `{"error": "Schedule not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |