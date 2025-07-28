# 프로젝트 진행도 API 문서

## 개요
프로젝트의 진행도를 LLM을 통해 자동으로 계산하고 관리하는 API입니다.

## API 엔드포인트

### 1. 진행도 조회
**GET** `/api/projects/{projectId}/progress`

프로젝트의 현재 진행도를 조회합니다.

#### 요청
- **Headers**: `Authorization: Bearer {token}`
- **Parameters**: `projectId` (path parameter)

#### 응답
```json
{
  "projectId": 1,
  "projectName": "프로젝트명",
  "progress": 75,
  "totalScrums": 10,
  "hasPlanning": true,
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

### 2. 진행도 계산 (수동)
**POST** `/api/projects/{projectId}/progress/calculate`

LLM을 통해 프로젝트 진행도를 재계산합니다.

#### 요청
- **Headers**: `Authorization: Bearer {token}`
- **Parameters**: `projectId` (path parameter)

#### 응답
```json
{
  "projectId": 1,
  "projectName": "프로젝트명",
  "calculatedProgress": 80,
  "totalScrums": 12,
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

### 3. 스크럼 생성 (자동 진행도 업데이트)
**POST** `/api/projects/{projectId}/scrums`

스크럼을 생성하고 자동으로 진행도를 업데이트합니다.

#### 요청
- **Headers**: `Authorization: Bearer {token}`
- **Parameters**: `projectId` (path parameter)
- **Body**:
```json
{
  "done": "완료된 작업들",
  "plan": "계획된 작업들",
  "others": "기타 사항 (선택사항)"
}
```

#### 응답
```json
{
  "scrumId": 1,
  "projectId": 1,
  "date": "2024-01-01",
  "done": "완료된 작업들",
  "plan": "계획된 작업들",
  "others": "기타 사항",
  "progressUpdateTriggered": true
}
```

## 환경변수 설정

`.env.local` 파일에 다음 환경변수를 설정해야 합니다:

```env
# Grok LLM API Configuration
GROK_API_KEY=your_grok_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 진행도 계산 로직

1. **프로젝트 기획서** (`PROJECTS.planning`) 조회
2. **모든 스크럼 데이터** (`SCRUMS.done`, `SCRUMS.plan`) 조회
3. **LLM 프롬프트 구성**:
   - 프로젝트 기획서
   - 완료된 작업들
   - 계획된 작업들
4. **Grok LLM 호출**하여 진행도 계산
5. **PROJECTS.progress** 컬럼 업데이트

## 에러 코드

- `401`: 인증 실패
- `403`: 프로젝트 참여자 권한 없음
- `404`: 프로젝트를 찾을 수 없음
- `500`: 서버 내부 오류 또는 LLM 서비스 오류

## 사용 예시

### 프론트엔드에서 진행도 조회
```javascript
const response = await fetch(`/api/projects/${projectId}/progress`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log(`진행도: ${data.progress}%`);
```

### 수동으로 진행도 재계산
```javascript
const response = await fetch(`/api/projects/${projectId}/progress/calculate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log(`새로운 진행도: ${data.calculatedProgress}%`);
``` 