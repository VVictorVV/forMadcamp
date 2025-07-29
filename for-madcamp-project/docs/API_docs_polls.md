## **API 21: 투표 리스트 불러오기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 분반에 속한 모든 투표의 목록을 불러옵니다. |
| Method | GET |
| URL | /api/classes/{classId}/polls |
| 인증 | **필수 (JWT)**. 요청 헤더에 `Authorization: Bearer {accessToken}`을 포함해야 합니다. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | classId | Integer | 정보를 조회할 분반의 고유 ID | Y |

### **3. 응답 (Response)**

- **성공 시 (200 OK)**

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| polls | Array | 해당 분반의 모든 투표 객체 배열 |
| poll.pollId | Integer | 투표 고유 ID |
| poll.pollName | String | 투표 제목 |
| poll.creatorName | String | 투표를 생성한 유저 이름 |
| poll.createdAt | Datetime | 투표 생성 시간 |
| poll.deadline | Datetime | 투표 마감 시간 (null일 수 있음) |
| poll.totalVotes | Integer | 해당 투표의 총 투표 수 |
| poll.hasVoted | Boolean | 요청을 보낸 유저의 투표 여부 |

```json
{
  "polls": [
    {
      "pollId": 301,
      "pollName": "1주차 회식 장소 정하기",
      "creatorName": "홍길동",
      "createdAt": "2024-07-28T10:00:00Z",
      "deadline": "2024-07-29T18:00:00Z",
      "totalVotes": 15,
      "hasVoted": true
    },
    {
      "pollId": 302,
      "pollName": "스터디 시간 정하기",
      "creatorName": "김철수",
      "createdAt": "2024-07-29T11:00:00Z",
      "deadline": null,
      "totalVotes": 8,
      "hasVoted": false
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

## **API 22: 자세한 투표 정보 불러오기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 투표의 선택지, 투표 수 등 상세 정보를 불러옵니다. |
| Method | GET |
| URL | /api/polls/{pollId} |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | pollId | Integer | 조회할 투표의 고유 ID | Y |

### **3. 응답 (Response)**

- **성공 시 (200 OK)**

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| pollId | Integer | 투표 고유 ID |
| pollName | String | 투표 제목 |
| ... | ... | (API 08의 모든 필드 포함) |
| currentUserVote | Integer / Null | 현재 유저가 투표한 선택지 ID (투표 안했으면 null) |
| options | Array | 선택지 정보 객체 배열 |
| option.optionId | Integer | 선택지 고유 ID |
| option.optionName | String | 선택지 이름 |
| option.voteCount | Integer | 해당 선택지의 득표 수 |

```json
{
  "pollId": 301,
  "pollName": "1주차 회식 장소 정하기",
  "creatorName": "홍길동",
  "createdAt": "2024-07-28T10:00:00Z",
  "deadline": "2024-07-29T18:00:00Z",
  "totalVotes": 15,
  "hasVoted": true,
  "currentUserVote": 401,
  "options": [
    {
      "optionId": 401,
      "optionName": "치킨/피자",
      "voteCount": 8
    },
    {
      "optionId": 402,
      "optionName": "삼겹살",
      "voteCount": 5
    },
    {
      "optionId": 403,
      "optionName": "마라탕",
      "voteCount": 2
    }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 해당 투표를 볼 권한이 없음 (다른 분반의 투표) | `{"error": "Access denied."}` |
| 404 Not Found | 해당 `pollId`를 가진 투표가 존재하지 않음 | `{"error": "Poll not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 23: 투표 만들기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 새로운 투표를 생성합니다. |
| Method | POST |
| URL | /api/polls |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Body | pollName | String | 생성할 투표의 제목 | Y |
| Body | deadline | Datetime | 투표 마감 시간 (선택 사항) | N |
| Body | options | Array of Strings | 선택지 이름 배열 (최소 2개 이상) | Y |

*투표 생성자(`made_by`)와 분반(`class_id`) 정보는 인증 토큰에서 추출하여 사용합니다.*

```json
{
  "pollName": "2주차 프로젝트 아이디어",
  "deadline": "2024-08-05T23:59:59Z",
  "options": [
    "개인 맞춤형 맛집 추천 서비스",
    "실시간 협업 화이트보드",
    "블록체인 기반 중고거래 플랫폼"
  ]
}
```

### **3. 응답 (Response)**

- **성공 시 (201 Created)**
    - 생성된 투표의 상세 정보를 반환합니다.

```json
{
  "pollId": 303,
  "pollName": "2주차 프로젝트 아이디어",
  "creatorName": "이영희",
  "createdAt": "2024-07-30T14:00:00Z",
  "deadline": "2024-08-05T23:59:59Z",
  "totalVotes": 0,
  "hasVoted": false,
  "currentUserVote": null,
  "options": [
    { "optionId": 404, "optionName": "개인 맞춤형 맛집 추천 서비스", "voteCount": 0 },
    { "optionId": 405, "optionName": "실시간 협업 화이트보드", "voteCount": 0 },
    { "optionId": 406, "optionName": "블록체인 기반 중고거래 플랫폼", "voteCount": 0 }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | 필수 필드 누락 또는 선택지가 2개 미만 | `{"error": "Invalid request body. A poll must have at least 2 options."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 24: 투표 참여하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 투표의 선택지에 투표합니다. 이미 투표한 경우, 투표를 변경합니다. |
| Method | POST |
| URL | /api/polls/{pollId}/votes |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | pollId | Integer | 투표할 투표의 고유 ID | Y |
| Body | optionId | Integer | 투표할 선택지의 고유 ID | Y |

*투표하는 유저(`user_id`) 정보는 인증 토큰에서 추출하여 사용합니다.*

```json
{
  "optionId": 402
}
```

### **3. 응답 (Response)**

- **성공 시 (200 OK)**
    - 투표가 성공적으로 기록되었음을 알리는 메시지를 반환합니다.

```json
{
  "message": "Your vote has been successfully recorded.",
  "pollId": 301,
  "myVote": 402
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | `optionId`가 없거나 유효하지 않음 | `{"error": "Invalid request body."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 투표가 마감되었음 | `{"error": "This poll is closed."}` |
| 404 Not Found | `pollId` 또는 `optionId`가 존재하지 않거나, 해당 투표의 선택지가 아님 | `{"error": "Poll or option not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 25: 투표 취소하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 투표에서 자신의 투표를 취소합니다. |
| Method | DELETE |
| URL | /api/polls/{pollId}/votes |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | pollId | Integer | 투표를 취소할 투표의 고유 ID | Y |

*투표를 취소하는 유저(`user_id`) 정보는 인증 토큰에서 추출하여 사용합니다.*

### **3. 응답 (Response)**

- **성공 시 (200 OK)**
    - 투표가 성공적으로 취소되었음을 알리는 메시지를 반환합니다.

```json
{
  "message": "Your vote has been successfully cancelled.",
  "pollId": 301
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 투표가 마감되었음 | `{"error": "This poll is closed."}` |
| 404 Not Found | `pollId`가 존재하지 않거나, 해당 투표에 투표한 기록이 없음 | `{"error": "Poll not found or no vote to cancel."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 26: 투표 관리하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 투표 생성자가 투표의 제목이나 마감 시간을 수정합니다. |
| Method | PUT |
| URL | /api/polls/{pollId} |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | pollId | Integer | 수정할 투표의 고유 ID | Y |
| Body | pollName | String | 수정할 투표 제목 | N |
| Body | deadline | Datetime | 수정할 마감 시간 | N |

```json
{
  "pollName": "1주차 회식 장소 최종 투표",
  "deadline": "2024-07-29T20:00:00Z"
}
```

### **3. 응답 (Response)**

- **성공 시 (200 OK)**
    - 수정이 완료된 투표의 상세 정보를 반환합니다.

```json
{
  "pollId": 301,
  "pollName": "1주차 회식 장소 최종 투표",
  "creatorName": "홍길동",
  "createdAt": "2024-07-28T10:00:00Z",
  "deadline": "2024-07-29T20:00:00Z",
  "totalVotes": 15,
  "hasVoted": true,
  "currentUserVote": 401,
  "options": [
    { "optionId": 401, "optionName": "치킨/피자", "voteCount": 8 },
    { "optionId": 402, "optionName": "삼겹살", "voteCount": 5 },
    { "optionId": 403, "optionName": "마라탕", "voteCount": 2 }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | 요청 본문이 비어있거나 형식이 잘못됨 | `{"error": "Invalid request body."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 투표 생성자가 아님 | `{"error": "You are not the creator of this poll."}` |
| 404 Not Found | `pollId`가 존재하지 않음 | `{"error": "Poll not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 27: 투표 삭제하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 투표 생성자가 투표를 삭제합니다. |
| Method | DELETE |
| URL | /api/polls/{pollId} |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | pollId | Integer | 삭제할 투표의 고유 ID | Y |

*삭제하는 유저(`user_id`) 정보는 인증 토큰에서 추출하여 사용합니다.*

### **3. 응답 (Response)**

- **성공 시 (200 OK)**
    - 투표가 성공적으로 삭제되었음을 알리는 메시지를 반환합니다.

```json
{
  "message": "Poll has been successfully deleted.",
  "pollId": 301
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | `pollId`가 없거나 유효하지 않음 | `{"error": "Poll ID is required."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 투표 생성자가 아님 | `{"error": "You are not the creator of this poll."}` |
| 404 Not Found | `pollId`가 존재하지 않음 | `{"error": "Poll not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |