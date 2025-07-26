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

## (추가) API 02-1: 로그아웃

### 1. 개요

| 항목   | 내용                                 |
| ------ | ------------------------------------ |
| 기능   | 현재 로그인한 사용자의 세션을 만료(로그아웃)합니다. |
| Method | POST                                 |
| URL    | /api/auth/logout                     |

### 2. 요청 (Request)

- **요청 헤더**

| 필드명        | 설명                                 |
| ------------- | ------------------------------------ |
| Authorization | `Bearer {accessToken}` 형식의 JWT 토큰 |

- **요청 본문**: 없음

### 3. 응답 (Response)

- **성공 시 (200 OK)**

| 필드명 | 타입   | 설명                |
| ------ | ------ | ------------------- |
| message | String | 로그아웃 성공 메시지 |

```json
{
  "message": "Successfully logged out."
}
```

- **실패 시**

| Status Code      | 원인                        | 에러 메시지 (JSON)                        |
| ---------------- | --------------------------- | ------------------------------------------ |
| 401 Unauthorized | 유효하지 않은 JWT 토큰       | `{"error": "Access token is invalid."}`    |
| 500 Internal Server Error | 서버 내부 문제        | `{"error": "Internal server error."}`      |

---

## API 03: API 03: 프로필 정보 불러오기

### 1. 개요

| 항목   | 내용                                 |
| ------ | ------------------------------------ |
| 기능   | 특정 유저의 상세 프로필 정보를 조회합니다. |
| Method | GET                                  |
| URL    | /api/users/{userId}                  |

### 2. 요청 (Request)

- **요청 헤더**

| 필드명        | 설명                                 |
| ------------- | ------------------------------------ |
| Authorization | `Bearer {accessToken}` 형식의 JWT 토큰 |

- **경로 파라미터 (Path Parameter)**

| 필드명 | 타입    | 설명                | 필수 여부 |
| ------ | ------- | ------------------- | --------- |
| userId | String(UUID) | 정보를 조회할 유저의 고유 ID | Y         |

### 3. 응답 (Response)

- **성공 시 (200 OK)**

| 필드명         | 타입   | 설명                        |
| -------------- | ------ | --------------------------- |
| id             | String | 유저의 고유 ID (UUID)       |
| name           | String | 유저의 이름                 |
| email          | String | 유저의 email                |
| profileImageUri| String | 유저의 프로필 이미지 URI    |
| instagramUri   | String | 유저의 인스타그램 URI       |
| school         | String | 유저의 출신 학교            |
| classInfo      | Object | 분반 정보                   |
| classInfo.seasonName | String | 분반 시즌             |
| classInfo.classNum   | Integer | 몇 번째 분반인지      |
| projects       | Array  | 프로젝트 정보               |
| interestedTopics | Array | 관심 주제 정보             |
| schedules      | Array  | 일정 정보                   |

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "홍길동",
  "email": "test@gmail.com",
  "profileImageUri": "/images/profiles/user_1.jpg",
  "instagramUri": "https://instagram.com/honggildong",
  "school": "서울대학교",
  "classInfo": {
    "seasonName": "2025년 여름 몰입캠프",
    "classNum": 1
  },
  "projects": [
    { "projectId": 101, "projectName": "몰입캠프 통합 대시보드", "weekNum": 1 }
  ],
  "interestedTopics": [
    { "topicId": 22, "title": "AI를 활용한 코드 리뷰 자동화", "level": 5 }
  ],
  "schedules": [
    { "scheduleId": 5, "scheduleName": "1주차 최종 발표", "when": "2025-08-01T16:00:00Z", "role": "발표자" }
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

## API 04: API 04: 프로필 정보 수정하기

### 1. 개요

| 항목   | 내용                                 |
| ------ | ------------------------------------ |
| 기능   | 현재 로그인한 유저의 프로필 정보를 수정합니다. |
| Method | PUT                                  |
| URL    | /api/users/me                        |

### 2. 요청 (Request)

- **요청 헤더**

| 필드명        | 설명                                 |
| ------------- | ------------------------------------ |
| Authorization | `Bearer {accessToken}` 형식의 JWT 토큰 |

- **요청 본문 (Request Body)**

| 필드명         | 타입   | 설명                        | 필수 여부 |
| -------------- | ------ | --------------------------- | --------- |
| name           | String | 변경할 유저 이름            | N         |
| profileImageUri| String | 변경할 프로필 이미지 URI    | N         |
| instagramUri   | String | 변경할 인스타그램 URI       | N         |
| school         | String | 변경할 출신 학교            | N         |
| interestedTopics | Array | 관심 주제 정보              | N         |

```json
{
  "name": "홍길동 주니어",
  "profileImageUri": "/images/profiles/user_1_new.jpg",
  "instagramUri": "https://instagram.com/honggildong",
  "school": "서울대학교"
}
```

### 3. 응답 (Response)

- **성공 시 (200 OK)**

| 필드명         | 타입   | 설명                        |
| -------------- | ------ | --------------------------- |
| id             | String | 유저의 고유 ID (UUID)       |
| name           | String | 유저의 이름                 |
| email          | String | 유저의 email                |
| profileImageUri| String | 유저의 프로필 이미지 URI    |
| instagramUri   | String | 유저의 인스타그램 URI       |
| school         | String | 유저의 출신 학교            |
| classInfo      | Object | 분반 정보                   |
| interestedTopics | Array | 관심 주제 정보              |

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "홍길동 주니어",
  "email": "test@gmail.com",
  "profileImageUri": "/images/profiles/user_1_new.jpg",
  "instagramUri": "https://instagram.com/honggildong",
  "school": "서울대학교"
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