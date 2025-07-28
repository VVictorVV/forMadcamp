## **API 41: 스크럼 리스트 불러오기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 날짜, 특정 분반의 모든 스크럼 정보를 불러옵니다. |
| Method | GET |
| URL | /api/classes/{classId}/scrums |
| 인증 | **필수 (JWT)**. 요청 헤더에 `Authorization: Bearer {accessToken}`을 포함해야 합니다. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | classId | Integer | 조회할 분반의 고유 ID | Y |
| Query | date | String | 조회할 날짜 (YYYY-MM-DD 형식). 미입력 시 오늘 날짜로 자동 설정됩니다. | N |

### **3. 응답 (Response)**

- **성공 시 (200 OK)**

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| scrums | Array | 해당 날짜, 해당 분반의 모든 스크럼 객체 배열 |
| scrum.scrumId | Integer | 스크럼 고유 ID |
| scrum.project | Object | 연관된 프로젝트 정보 |
| project.projectId | Integer | 프로젝트 고유 ID |
| project.projectName | String | 프로젝트 이름 |
| scrum.author | Object | 작성자 정보 |
| author.userId | Integer | 작성자 유저 ID |
| author.name | String | 작성자 이름 |
| scrum.done | String | 어제 한 일 |
| scrum.plan | String | 오늘 할 일 |
| scrum.others | String | 기타 공유 사항 |

```json
{
  "scrums": [
    {
      "scrumId": 601,
      "project": {
        "projectId": 101,
        "projectName": "몰입캠프 통합 관리 시스템"
      },
      "author": {
        "userId": 1,
        "name": "홍길동"
      },
      "done": "API 명세서 초안 작성 완료",
      "plan": "투표 관련 API 구현 시작",
      "others": "Jest 설정에 어려움이 있어 도움이 필요합니다."
    },
    {
      "scrumId": 602,
      "project": {
        "projectId": 101,
        "projectName": "몰입캠프 통합 관리 시스템"
      },
      "author": {
        "userId": 2,
        "name": "김철수"
      },
      "done": "로그인 UI 컴포넌트 개발",
      "plan": "JWT 인증 로직 서버와 연동",
      "others": ""
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

## **API 42: 나의 오늘 스크럼 정보 불러오기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 프로젝트에 대해 **오늘 날짜**로 내가 작성한 스크럼 정보를 불러옵니다. |
| Method | GET |
| URL | /api/projects/{projectId}/scrums/me |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | projectId | Integer | 조회할 프로젝트의 고유 ID | Y |

*유저 정보와 '오늘 날짜'는 서버에서 자동으로 인식합니다.*

### **3. 응답 (Response)**

- **성공 시 (200 OK)**
    - 작성된 스크럼이 있는 경우, 해당 스크럼 정보를 반환합니다.
    - 작성된 스크럼이 없는 경우, `null`을 반환합니다.

```json
// 스크럼이 있는 경우
{
  "scrumId": 601,
  "projectId": 101,
  "date": "2025-07-25",
  "done": "API 명세서 초안 작성 완료",
  "plan": "투표 관련 API 구현 시작",
  "others": "Jest 설정에 어려움이 있어 도움이 필요합니다."
}

// 스크럼이 없는 경우
null
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 해당 프로젝트의 참여자가 아님 | `{"error": "You are not a member of this project."}` |
| 404 Not Found | 해당 `projectId`를 가진 프로젝트가 존재하지 않음 | `{"error": "Project not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 43: 스크럼 정보 입력하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 프로젝트에 대한 오늘의 스크럼을 작성합니다. |
| Method | POST |
| URL | /api/projects/{projectId}/scrums |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | projectId | Integer | 스크럼을 작성할 프로젝트의 고유 ID | Y |
| Body | done | String | 어제 한 일 | Y |
| Body | plan | String | 오늘 할 일 | Y |
| Body | others | String | 기타 공유 사항 | N |

*작성자(`user_id`)와 날짜(`date`) 정보는 서버에서 자동으로 생성합니다.*

```json
{
  "done": "투표 참여하기 API 구현 완료",
  "plan": "투표 관리하기 API 구현 및 테스트 코드 작성",
  "others": "서버 배포 관련해서 논의가 필요합니다."
}
```

### **3. 응답 (Response)**

- **성공 시 (201 Created)**
    - 생성된 스크럼의 전체 정보를 반환합니다.

```json
{
  "scrumId": 603,
  "projectId": 101,
  "author": {
    "userId": 1,
    "name": "홍길동"
  },
  "date": "2025-07-25",
  "done": "투표 참여하기 API 구현 완료",
  "plan": "투표 관리하기 API 구현 및 테스트 코드 작성",
  "others": "서버 배포 관련해서 논의가 필요합니다."
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | 필수 필드가 누락됨 | `{"error": "Invalid request body."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 해당 프로젝트의 참여자가 아님 | `{"error": "You are not a member of this project."}` |
| 404 Not Found | `projectId`가 존재하지 않음 | `{"error": "Project not found."}` |
| 409 Conflict | 해당 프로젝트에 대해 이미 오늘 작성한 스크럼이 존재함 | `{"error": "Today's scrum for this project already exists."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 44: 스크럼 정보 수정하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 이미 작성한 스크럼의 내용을 수정합니다. |
| Method | PUT |
| URL | /api/scrums/{scrumId} |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | scrumId | Integer | 수정할 스크럼의 고유 ID | Y |
| Body | done | String | 수정할 '어제 한 일' 내용 | N |
| Body | plan | String | 수정할 '오늘 할 일' 내용 | N |
| Body | others | String | 수정할 '기타' 내용 | N |

```json
{
  "plan": "투표 관리하기 API 리팩토링 및 테스트 코드 보강",
  "others": "서버 배포는 다음주 월요일에 진행하는 것으로 결정되었습니다."
}
```

### **3. 응답 (Response)**

- **성공 시 (200 OK)**
    - 수정이 완료된 스크럼의 전체 정보를 반환합니다.

```json
{
  "scrumId": 603,
  "projectId": 101,
  "author": {
    "userId": 1,
    "name": "홍길동"
  },
  "date": "2025-07-25",
  "done": "투표 참여하기 API 구현 완료",
  "plan": "투표 관리하기 API 리팩토링 및 테스트 코드 보강",
  "others": "서버 배포는 다음주 월요일에 진행하는 것으로 결정되었습니다."
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | 요청 본문이 비어있거나 형식이 잘못됨 | `{"error": "Invalid request body."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 스크럼 작성자가 아님 | `{"error": "You are not the author of this scrum."}` |
| 404 Not Found | `scrumId`가 존재하지 않음 | `{"error": "Scrum not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |