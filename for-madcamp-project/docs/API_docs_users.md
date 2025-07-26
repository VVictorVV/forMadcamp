# 유저 정보 관련 API

## API 01: 회원가입

### 1. 개요

| 항목 | 내용 |
| --- | --- |
| 기능 | email, 이름, password를 받아 신규 유저를 생성합니다. |
| Method | POST |
| URL | /api/users/signup |

### 2. 요청 (Request)

| 필드명 | 타입 | 설명 | 필수 여부 |
| --- | --- | --- | --- |
| email | String | 가입 및 로그인에 사용할 이메일 | Y |
| name | String | 서비스 내에서 표시될 이름 | Y |
| password | String | 로그인에 사용할 비밀번호 (Plain Text) | Y |

```json
{
  "email": "newbie@gmail.com",
  "name": "김코딩",
  "password": "mySecurePassword123"
}
```

### 3. 응답 (Response)

- **성공 시 (201 Created)**

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| id | Integer | 생성된 유저의 고유 ID |
| email | String | 생성된 유저의 이메일 |
| name | String | 생성된 유저의 이름 |
| createdAt | Datetime | 계정 생성 시각 |

```json
{
  "id": 15,
  "email": "newbie@gmail.com",
  "name": "김코딩",
  "createdAt": "2025-07-26T10:00:00Z"
}
```

- **실패 시**

| Status Code | 원인 | 에러 메시지 (JSON) |
| --- | --- | --- |
| 400 Bad Request | 필수 필드 누락 또는 형식 오류 | `{"error": "Email and password are required."}` |
| 409 Conflict | 이미 존재하는 이메일 | `{"error": "This email is already taken."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

---

## API 02: 로그인

### 1. 개요

| 항목 | 내용 |
| --- | --- |
| 기능 | email, password를 기반으로 사용자를 인증하고 JWT 토큰을 발급합니다. |
| Method | POST |
| URL | /api/auth/login |

### 2. 요청 (Request)

| 필드명 | 타입 | 설명 | 필수 여부 |
| --- | --- | --- | --- |
| email | String | 로그인에 사용할 이메일 | Y |
| password | String | 로그인에 사용할 비밀번호 (Plain Text) | Y |

```json
{
  "email": "test@gmail.com",
  "password": "mySecurePassword123"
}
```

### 3. 응답 (Response)

- **성공 시 (200 OK)**

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| accessToken | String | 서비스 전용 JWT 인증 토큰. 이후 API 요청 시 헤더에 담아 보내야 합니다. |
| user | Object | 로그인한 사용자 정보 |
| user.id | Integer | 유저 고유 ID |
| user.name | String | 유저 이름 |

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQi...",
  "user": {
    "id": 1,
    "name": "홍길동"
  }
}
```

- **실패 시**

| Status Code | 원인 | 에러 메시지 (JSON) |
| --- | --- | --- |
| 400 Bad Request | 필수 필드 누락 | `{"error": "Email and password are required."}` |
| 401 Unauthorized | 유효하지 않은 로그인 정보 (이메일 또는 비밀번호 불일치) | `{"error": "Invalid credentials."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

---

## API 03: 프로필 정보 불러오기

### 1. 개요

| 항목 | 내용 |
| --- | --- |
| 기능 | 특정 유저의 상세 프로필 정보를 조회합니다. |
| Method | GET |
| URL | /api/users/{userId} |

### 2. 요청 (Request)

- **요청 헤더**

| 필드명 | 설명 |
| --- | --- |
| Authorization | `Bearer {accessToken}` 형식의 JWT 토큰 |
- **경로 파라미터 (Path Parameter)**

| 필드명 | 타입 | 설명 | 필수 여부 |
| --- | --- | --- | --- |
| userId | Integer | 정보를 조회할 유저의 고유 ID | Y |

### 3. 응답 (Response)

- **성공 시 (200 OK)**

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| userId | Integer | 유저의 고유 ID |
| name | String | 유저의 이름 |
| email | String | 유저의 email |
| profileImageUri | String | 유저의 프로필 이미지 URI |
| classInfo | Object | 분반 |
| classInfo.seasonName | String | 분반 시즌 |
| classInfo.classNum | Integer | 몇 번째 분반인지 |
| projects | Object | 프로젝트 |
| projects.projectId | Integer | 프로젝트 고유의 ID |
| projects.projectName | String | 프로젝트의 제목 |
| projects.weekNum | Integer | 프로젝트 몇 주차인지 |
| interestedTopics | Object | 관심 주제 |
| interestedTopics.topicId | Integer | 관심 주제의 고유 ID |
| interestedTopics.title | String | 관심 주제의 이름 |
| interestedTopics.level | Integer | 관심 주제에 대한 관심도 |
| schedules | Object | 일정 |
| schedules.scheduleId | Integer | 일정의 고유 ID |
| schedules.scheduleName | String | 일정의 이름 |
| schedules.when | DateTime | 일정의 시작일 |

```json
{
  "id": 1,
  "name": "홍길동",
  "email": "test@gmail.com",
  "profileImageUri": "/images/profiles/user_1.jpg",
  "classInfo": {
    "seasonName": "2025년 여름 몰입캠프",
    "classNum": 1
  },
  "projects": [
    { "projectId": 101, "projectName": "몰입캠프 통합 대시보드", "weekNum": 1 },
    { "projectId": 105, "projectName": "실시간 스크럼 공유 서비스", "weekNum": 2 }
  ],
  "interestedTopics": [
    { "topicId": 22, "title": "AI를 활용한 코드 리뷰 자동화", "level": 5 },
    { "topicId": 24, "title": "WebRTC 기반 화상 회의 시스템", "level": 4 }
  ],
  "schedules": [
    { "scheduleId": 5, "scheduleName": "1주차 최종 발표", "when": "2025-08-01T16:00:00Z", "role": "발표자" },
    { "scheduleId": 8, "scheduleName": "게더타운 회고", "when": "2025-08-01T19:00:00Z", "role": "참여자" }
  ]
}
```

- **실패 시**

| Status Code | 원인 | 에러 메시지 (JSON) |
| --- | --- | --- |
| 401 Unauthorized | 유효하지 않은 JWT 토큰 | `{"error": "Access token is invalid."}` |
| 404 Not Found | 존재하지 않는 유저 ID | `{"error": "User not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

---

## API 04: 프로필 정보 수정하기

### 1. 개요

| 항목 | 내용 |
| --- | --- |
| 기능 | 현재 로그인한 유저의 프로필 정보를 수정합니다. |
| Method | PUT |
| URL | /api/users/me |

### 2. 요청 (Request)

- **요청 헤더**

| 필드명 | 설명 |
| --- | --- |
| Authorization | `Bearer {accessToken}` 형식의 JWT 토큰 |
- **요청 본문 (Request Body)**

| 필드명 | 타입 | 설명 | 필수 여부 |
| --- | --- | --- | --- |
| name | String | 변경할 유저 이름 | N |
| profileImageUri | String | 변경할 프로필 이미지의 경로 | N |
| … (그 외 기타 정보들) | … | … | N |

```json
{
  "name": "홍길동 주니어",
  "profileImageUri": "/images/profiles/user_1_new.jpg"
}
```

### 3. 응답 (Response)

- **성공 시 (200 OK)**: 수정된 유저 정보를 반환합니다.

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| userId | Integer | 유저의 고유 ID |
| … |  |  |

```json
{
  "id": 1,
  "name": "홍길동 주니어",
  "email": "test@gmail.com",
  "profileImageUri": "/images/profiles/user_1_new.jpg"
}
```

- **실패 시**

| Status Code | 원인 | 에러 메시지 (JSON) |
| --- | --- | --- |
| 400 Bad Request | 잘못된 요청 데이터 | `{"error": "Invalid request body."}` |
| 401 Unauthorized | 유효하지 않은 JWT 토큰 | `{"error": "Access token is invalid."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

---

## API 05: 비밀번호 변경하기

### 1. 개요

| 항목 | 내용 |
| --- | --- |
| 기능 | 현재 로그인한 유저의 비밀번호를 변경합니다. |
| Method | PUT |
| URL | /api/users/me/password |

### 2. 요청 (Request)

- **요청 헤더**

| 필드명 | 설명 |
| --- | --- |
| Authorization | `Bearer {accessToken}` 형식의 JWT 토큰 |
- **요청 본문 (Request Body)**

| 필드명 | 타입 | 설명 | 필수 여부 |
| --- | --- | --- | --- |
| currentPassword | String | 현재 비밀번호 (인증용) | Y |
| newPassword | String | 변경할 새 비밀번호 | Y |

```json
{
  "currentPassword": "mySecurePassword123",
  "newPassword": "myNewSuperPassword456"
}
```

### 3. 응답 (Response)

- **성공 시 (204 No Content)**: 성공적으로 변경되었으며, 별도의 응답 본문은 없습니다.
- **실패 시**

| Status Code | 원인 | 에러 메시지 (JSON) |
| --- | --- | --- |
| 400 Bad Request | 필수 필드 누락 또는 새 비밀번호가 정책에 맞지 않음 | `{"error": "New password does not meet policy."}` |
| 401 Unauthorized | 유효하지 않은 JWT 토큰 | `{"error": "Access token is invalid."}` |
| 403 Forbidden | 현재 비밀번호 불일치 | `{"error": "Current password does not match."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

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