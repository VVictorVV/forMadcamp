# 추억 갤러리 관련 API

## **API 51: 추억 리스트 불러오기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 특정 분반에 속한 모든 추억 사진의 목록을 불러옵니다. |
| Method | GET |
| URL | /api/classes/{classId}/memories |
| 인증 | **필수 (JWT)**. 요청 헤더에 `Authorization: Bearer {accessToken}`을 포함해야 합니다. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | classId | Integer | 정보를 조회할 분반의 고유 ID | Y |

### **3. 응답 (Response)**

- **성공 시 (200 OK)**

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| memories | Array | 해당 분반의 모든 추억 객체 배열 |
| memory.memoryId | Integer | 추억 고유 ID |
| memory.name | String | 사진 이름 |
| memory.imageUrl | String | 이미지 URL |
| memory.createdAt | Datetime | 추억 생성 시간 |
| memory.creatorName | String | 추억을 업로드한 유저 이름 |

```json
{
  "memories": [
    {
      "memoryId": 1001,
      "name": "1주차 팀 프로젝트 완성",
      "imageUrl": "https://storage.supabase.com/memories/class1_week1_team.jpg",
      "createdAt": "2024-07-28T15:30:00Z",
      "creatorName": "홍길동"
    },
    {
      "memoryId": 1002,
      "name": "스터디룸에서의 밤샘 코딩",
      "imageUrl": "https://storage.supabase.com/memories/class1_night_coding.jpg",
      "createdAt": "2024-07-29T02:15:00Z",
      "creatorName": "김철수"
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

## **API 52: 추억 저장하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 새로운 추억 사진을 업로드하고 저장합니다. |
| Method | POST |
| URL | /api/classes/{classId}/memories |
| 인증 | **필수 (JWT)**. 요청 헤더에 `Authorization: Bearer {accessToken}`을 포함해야 합니다. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | classId | Integer | 추억을 저장할 분반의 고유 ID | Y |
| Body | name | String | 사진 이름 (최대 100자) | Y |
| Body | imageFile | File | 업로드할 이미지 파일 (JPG, PNG, GIF만 허용, 최대 10MB) | Y |

### **3. 응답 (Response)**

- **성공 시 (201 Created)**

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| memoryId | Integer | 생성된 추억의 고유 ID |
| name | String | 저장된 사진 이름 |
| imageUrl | String | 저장된 이미지 URL |
| createdAt | Datetime | 추억 생성 시간 |
| creatorName | String | 업로드한 유저 이름 |

```json
{
  "memoryId": 1003,
  "name": "팀 빌딩 활동",
  "imageUrl": "https://storage.supabase.com/memories/class1_teambuilding_20240730.jpg",
  "createdAt": "2024-07-30T14:20:00Z",
  "creatorName": "이영희"
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | 필수 필드 누락 또는 잘못된 파일 형식 | `{"error": "Invalid request data."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 요청한 유저가 해당 분반 소속이 아님 | `{"error": "Access denied."}` |
| 404 Not Found | 해당 `classId`를 가진 분반이 존재하지 않음 | `{"error": "Class not found."}` |
| 413 Payload Too Large | 파일 크기가 10MB를 초과함 | `{"error": "File size too large."}` |
| 415 Unsupported Media Type | 지원하지 않는 파일 형식 | `{"error": "Unsupported file type."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |

## **API 53: 추억 수정하기**

### **1. 개요**

| **항목** | **내용** |
| --- | --- |
| 기능 | 기존 추억의 이름을 수정합니다. |
| Method | PUT |
| URL | /api/memories/{memoryId} |
| 인증 | **필수 (JWT)**. 요청 헤더에 `Authorization: Bearer {accessToken}`을 포함해야 합니다. |

### **2. 요청 (Request)**

| **구분** | **필드명** | **타입** | **설명** | **필수 여부** |
| --- | --- | --- | --- | --- |
| Path | memoryId | Integer | 수정할 추억의 고유 ID | Y |
| Body | name | String | 새로운 사진 이름 (최대 100자) | Y |

### **3. 응답 (Response)**

- **성공 시 (200 OK)**

| **필드명** | **타입** | **설명** |
| --- | --- | --- |
| memoryId | Integer | 수정된 추억의 고유 ID |
| name | String | 수정된 사진 이름 |
| imageUrl | String | 이미지 URL (변경 없음) |
| createdAt | Datetime | 원본 생성 시간 |
| updatedAt | Datetime | 수정 시간 |
| creatorName | String | 업로드한 유저 이름 |

```json
{
  "memoryId": 1001,
  "name": "1주차 팀 프로젝트 완성 - 수정됨",
  "imageUrl": "https://storage.supabase.com/memories/class1_week1_team.jpg",
  "createdAt": "2024-07-28T15:30:00Z",
  "updatedAt": "2024-07-30T16:45:00Z",
  "creatorName": "홍길동"
}
```

- **실패 시**

| **Status Code** | **원인** | **에러 메세지 (JSON)** |
| --- | --- | --- |
| 400 Bad Request | 필수 필드 누락 또는 잘못된 데이터 | `{"error": "Invalid request data."}` |
| 401 Unauthorized | 인증 토큰이 없거나 유효하지 않음 | `{"error": "Authentication required."}` |
| 403 Forbidden | 수정 권한이 없음 (본인이 업로드한 추억만 수정 가능) | `{"error": "Access denied."}` |
| 404 Not Found | 해당 `memoryId`를 가진 추억이 존재하지 않음 | `{"error": "Memory not found."}` |
| 500 Internal Server Error | 서버 내부 문제 | `{"error": "Internal server error."}` |