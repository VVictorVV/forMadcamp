# 프로젝트 정보 관련 API

## **API 11: 프로젝트 정보 불러오기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 유저가 참여하고 있는 모든 프로젝트의 상세 정보를 불러옵니다. |
| Method | GET |
| URL | /api/users/{userId}/projects |
| 인증 | **필수 (JWT)**. 요청 헤더에 `Authorization: Bearer {accessToken}`을 포함해야 합니다. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | userId | Integer | 정보를 조회할 유저의 고유 ID | Y |

### **3. 응답 (Response)**

- **성공 시 (200 OK)**

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| projects | Array | 유저가 참여중인 프로젝트 객체의 배열 |
| project.projectId | Integer | 프로젝트 고유 ID |
| project.projectName | String | 프로젝트 이름 |
| project.classId | Integer | 프로젝트가 속한 분반 ID |
| project.weekNum | Integer | 프로젝트 주차 (1~4) |
| project.createdAt | Datetime | 프로젝트 생성일 |
| project.planning | String | 프로젝트 기획 내용 |
| project.progress | Integer | 프로젝트 진행도 (0~100) |
| project.representativeImageUri | String | 프로젝트 대표 이미지 URI |
| project.participators | Array | 참여자 정보 객체의 배열 |
| participator.profileId | String | 참여자 프로필 ID (UUID) |
| participator.name | String | 참여자 이름 |
| participator.role | String | 참여자 역할 (선택사항) |

```json
{
  "projects": [
    {
      "projectId": 101,
      "projectName": "몰입캠프 통합 관리 시스템",
      "classId": 1,
      "weekNum": 1,
      "createdAt": "2024-07-26T10:00:00Z",
      "planning": "1주차 프로젝트 기획: DB 설계 및 API 명세서 작성",
      "progress": 25,
      "representativeImageUri": "/images/projects/project_101.jpg",
      "participators": [
        {
          "profileId": "550e8400-e29b-41d4-a716-446655440000",
          "name": "홍길동",
          "role": "팀장"
        },
        {
          "profileId": "550e8400-e29b-41d4-a716-446655440001",
          "name": "김철수",
          "role": "팀원"
        }
      ]
    },
    {
      "projectId": 102,
      "projectName": "2주차 프로젝트 (미정)",
      "classId": 1,
      "weekNum": 2,
      "createdAt": "2024-07-26T10:00:00Z",
      "planning": null,
      "progress": 0,
      "representativeImageUri": null,
      "participators": [
        {
          "profileId": "550e8400-e29b-41d4-a716-446655440000",
          "name": "홍길동",
          "role": null
        }
      ]
    }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 자신의 정보가 아닌 다른 유저의 정보에 접근 시도 | `{"error": "Access denied."}` |
| 404 Not Found | 해당 `userId`를 가진 유저가 존재하지 않음 | `{"error": "User not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 12: 프로젝트 정보 입력(수정)하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 프로젝트의 이름, 설명 등 상세 정보를 입력하거나 수정합니다. |
| Method | PUT |
| URL | /api/projects/{projectId} |
| 인증 | **필수 (JWT)**. 해당 프로젝트의 참여자만 요청할 수 있습니다. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | projectId | Integer | 정보를 수정할 프로젝트의 고유 ID | Y |
| Body | projectName | String | 수정할 프로젝트 이름 | N |
| Body | planning | String | 수정할 프로젝트 기획/설명 내용 | N |
| Body | progress | Integer | 수정할 프로젝트 진행도 | N |
| Body | representativeImageUri | String | 수정할 프로젝트 대표 이미지 URI | N |

```json
{
  "projectName": "몰입캠프 학생 관리 웹 서비스",
  "planning": "1주차 프로젝트 기획: 유저 및 프로젝트 관련 기능 개발",
  "progress": 50,
  "representativeImageUri": "/images/projects/project_101_updated.jpg"
}
```

### **3. 응답 (Response)**

- **성공 시 (200 OK)**
    - 수정된 프로젝트의 전체 정보를 반환합니다.

```json
{
  "projectId": 101,
  "projectName": "몰입캠프 학생 관리 웹 서비스",
  "classId": 1,
  "weekNum": 1,
  "createdAt": "2024-07-26T10:00:00Z",
  "planning": "1주차 프로젝트 기획: 유저 및 프로젝트 관련 기능 개발",
  "progress": 50,
  "representativeImageUri": "/images/projects/project_101_updated.jpg",
  "participators": [
    {
      "profileId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "홍길동",
      "role": "팀장"
    },
    {
      "profileId": "550e8400-e29b-41d4-a716-446655440001",
      "name": "김철수",
      "role": "팀원"
    }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | 요청 본문의 형식이 잘못됨 (예: 타입 불일치) | `{"error": "Invalid request body."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 해당 프로젝트의 참여자가 아님 | `{"error": "You are not a member of this project."}` |
| 404 Not Found | 해당 `projectId`를 가진 프로젝트가 존재하지 않음 | `{"error": "Project not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 13: 프로젝트에 참여하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 요청을 보낸 유저가 특정 프로젝트에 참여자로 등록됩니다. |
| Method | POST |
| URL | /api/projects/{projectId}/participators |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | projectId | Integer | 참여할 프로젝트의 고유 ID | Y |
| Body | role | String | 참여자 역할 (선택사항) | N |

*참여할 유저의 정보는 인증 토큰(JWT)에서 추출하여 사용합니다.*

```json
{
  "role": "팀원"
}
```

### **3. 응답 (Response)**

- **성공 시 (201 Created)**
    - 참여가 완료되었다는 메세지와 함께 현재 참여자 목록을 반환합니다.

```json
{
  "message": "Successfully joined the project.",
  "participators": [
    {
      "profileId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "홍길동",
      "role": "팀장"
    },
    {
      "profileId": "550e8400-e29b-41d4-a716-446655440002",
      "name": "이영희",
      "role": "팀원"
    }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 유저가 프로젝트와 다른 분반에 속해 있어 참여 불가 | `{"error": "Cannot join a project from another class."}` |
| 404 Not Found | 해당 `projectId`를 가진 프로젝트가 존재하지 않음 | `{"error": "Project not found."}` |
| 409 Conflict | 이미 해당 프로젝트에 참여중이거나, 참여 인원(최대 3명)이 모두 참 | `{"error": "Project is already full or you are already a member."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 14: 새 프로젝트 생성하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 새로운 프로젝트를 생성하고 요청한 유저를 참여자로 등록합니다. |
| Method | POST |
| URL | /api/projects |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Body | projectName | String | 프로젝트 이름 | Y |
| Body | classId | Integer | 프로젝트가 속할 분반 ID | Y |
| Body | weekNum | Integer | 프로젝트 주차 (1~4) | Y |
| Body | planning | String | 프로젝트 기획 내용 | N |
| Body | representativeImageUri | String | 프로젝트 대표 이미지 URI | N |
| Body | role | String | 생성자의 역할 (기본값: "팀장") | N |

*프로젝트 생성자는 자동으로 참여자로 등록됩니다.*

```json
{
  "projectName": "몰입캠프 통합 관리 시스템",
  "classId": 1,
  "weekNum": 1,
  "planning": "1주차 프로젝트 기획: DB 설계 및 API 명세서 작성",
  "representativeImageUri": "/images/projects/project_101.jpg",
  "role": "팀장"
}
```

### **3. 응답 (Response)**

- **성공 시 (201 Created)**
    - 생성된 프로젝트의 전체 정보를 반환합니다.

```json
{
  "projectId": 101,
  "projectName": "몰입캠프 통합 관리 시스템",
  "classId": 1,
  "weekNum": 1,
  "createdAt": "2024-07-26T10:00:00Z",
  "planning": "1주차 프로젝트 기획: DB 설계 및 API 명세서 작성",
  "progress": 0,
  "representativeImageUri": "/images/projects/project_101.jpg",
  "participators": [
    {
      "profileId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "홍길동",
      "role": "팀장"
    }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | 필수 필드 누락 또는 잘못된 데이터 형식 | `{"error": "Project name, class ID, and week number are required."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 유저가 해당 분반에 속하지 않음 | `{"error": "You are not a member of this class."}` |
| 409 Conflict | 같은 주차에 이미 프로젝트가 존재함 | `{"error": "A project already exists for this week."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 15: 관심 주제 입력하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 유저가 새로운 관심 주제를 제안하여 등록합니다. |
| Method | POST |
| URL | /api/topics |
| 인증 | **필수 (JWT)**. 요청 헤더에 `Authorization: Bearer {accessToken}`을 포함해야 합니다. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Body | title | String | 제안할 주제의 제목 (50자 이내) | Y |
| Body | description | String | 주제에 대한 상세 설명 | Y |

*주제를 생성하는 유저(`creator_id`) 정보는 인증 토큰에서 추출하여 사용합니다.*

```json
{
  "title": "AI를 활용한 실시간 스크럼 요약 봇",
  "description": "매일 작성되는 스크럼 내용을 분석하여 팀의 진행 상황과 이슈를 자동으로 요약하고 리포트하는 봇을 개발합니다."
}
```

### **3. 응답 (Response)**

- **성공 시 (201 Created)**
    - 생성된 주제의 전체 정보를 반환합니다.

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| topicId | Integer | 생성된 주제의 고유 ID |
| creatorId | Integer | 주제를 제안한 유저 ID |
| title | String | 주제 제목 |
| description | String | 주제 상세 설명 |
| createdAt | Datetime | 주제 생성 시간 |

```json
{
  "topicId": 201,
  "creatorId": 1,
  "title": "AI를 활용한 실시간 스크럼 요약 봇",
  "description": "매일 작성되는 스크럼 내용을 분석하여 팀의 진행 상황과 이슈를 자동으로 요약하고 리포트하는 봇을 개발합니다.",
  "createdAt": "2024-07-27T11:00:00Z"
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | 필수 필드가 누락되었거나 형식이 잘못됨 | `{"error": "Invalid request body."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 16: 다른 유저들의 관심 주제 불러오기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 현재 유저가 속한 분반의 모든 유저들이 제안한 관심 주제 목록을 불러옵니다. |
| Method | GET |
| URL | /api/classes/{classId}/topics |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | classId | Integer | 조회할 분반의 고유 ID | Y |

### **3. 응답 (Response)**

- **성공 시 (200 OK)**

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| topics | Array | 해당 분반의 모든 주제 객체 배열 |
| topic.topicId | Integer | 주제 고유 ID |
| topic.title | String | 주제 제목 |
| topic.creator | Object | 주제를 제안한 유저 정보 |
| creator.userId | Integer | 제안한 유저 ID |
| creator.name | String | 제안한 유저 이름 |
| topic.interests | Array | 해당 주제에 관심을 표명한 유저 정보 배열 |
| interest.userId | Integer | 관심을 표명한 유저 ID |
| interest.level | Integer | 관심도 (1~5) |

```json
{
  "topics": [
    {
      "topicId": 201,
      "title": "AI를 활용한 실시간 스크럼 요약 봇",
      "creator": {
        "userId": 1,
        "name": "홍길동"
      },
      "interests": [
        {
          "userId": 2,
          "level": 5
        },
        {
          "userId": 5,
          "level": 4
        }
      ]
    },
    {
      "topicId": 202,
      "title": "WebRTC 기반 화상 스터디 플랫폼",
      "creator": {
        "userId": 2,
        "name": "김철수"
      },
      "interests": []
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

## **API 17: 관심 주제에 의견 표명하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 관심 주제에 대해 자신의 관심도를 표현(생성 또는 수정)합니다. |
| Method | POST |
| URL | /api/topics/{topicId}/interests |
| 인증 | **필수 (JWT)**. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | topicId | Integer | 의견을 표명할 주제의 고유 ID | Y |
| Body | level | Integer | 관심도 (1~5 사이의 정수) | Y |

*의견을 표명하는 유저(`user_id`) 정보는 인증 토큰에서 추출하여 사용합니다.*

```json
{
  "level": 5
}
```

### **3. 응답 (Response)**

- **성공 시 (200 OK 또는 201 Created)**
    - `201 Created`: 해당 주제에 처음으로 관심을 표명했을 때
    - `200 OK`: 기존의 관심도를 수정했을 때
    - 응답 본문으로 해당 주제의 최신 관심 목록을 반환합니다.

```json
{
  "message": "Your interest has been successfully recorded.",
  "topicId": 202,
  "interests": [
    {
      "userId": 1,
      "level": 5
    }
  ]
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | `level` 값이 없거나 1~5 범위를 벗어남 | `{"error": "Interest level must be between 1 and 5."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 자신이 생성한 주제에는 의견을 표명할 수 없음 (정책에 따라 적용) | `{"error": "You cannot express interest in your own topic."}` |
| 404 Not Found | 해당 `topicId`를 가진 주제가 존재하지 않음 | `{"error": "Topic not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |