# svelte-check 오류 분석 보고서

**생성일**: 2025-01-27  
**svelte-check 버전**: 4.0.0  
**TypeScript 버전**: 5.5.0

## 요약

- **총 오류 수**: 129개
- **경고 수**: 1개
- **영향받은 파일 수**: 41개
- **빌드 상태**: 실패 (Exit code: 1)

## 오류 유형별 통계

### 1. Elysia API 타입 오류 (4개)
- Elysia 프레임워크와 SvelteKit 통합 시 타입 불일치
- 주요 파일: `authPlugin.ts`, `conversations.ts`, `models.ts`, `endpointOai.ts`

### 2. MongoDB 관련 오류 (47개)
- MongoDB 타입 선언 누락 및 StubCollection 타입 불일치
- 주요 파일: `migrations/**/*.ts`, `tree/**/*.spec.ts`

### 3. ConfigProxy 타입 오류 (15개)
- 환경 변수 설정 타입 정의 누락
- 주요 파일: `sendSlack.ts`, `usageLimits.ts`, `router/**/*.ts`

### 4. TypeScript 타입 호환성 오류 (35개)
- Model, Conversation, Message 등 핵심 타입 불일치
- 주요 파일: `+page.svelte`, `+server.ts`, `[id]/+page.svelte`

### 5. Svelte 컴포넌트 오류 (19개)
- Props 타입, undefined 처리, 컴포넌트 타입 오류
- 주요 파일: `BackgroundGenerationPoller.svelte`, `ChatMessage.svelte`, `ShareConversationModal.svelte`

### 6. 기타 타입 오류 (9개)
- 암시적 any 타입, 모듈 선언 누락 등

## 파일별 오류 목록

### Elysia API 관련 (4개 오류)

#### `src/lib/server/api/authPlugin.ts`
- **라인 14**: `Record<string, Cookie<unknown>>` 타입이 `Cookies` 타입에 할당 불가

#### `src/lib/server/api/routes/groups/conversations.ts`
- **라인 9**: `locals` 속성이 Elysia 컨텍스트 타입에 존재하지 않음

#### `src/lib/server/api/routes/groups/models.ts`
- **라인 133**: `error` 속성이 Elysia 컨텍스트 타입에 존재하지 않음

#### `src/lib/server/endpoints/openai/endpointOai.ts`
- **라인 244**: `TextGenerationStreamOutput` 타입이 `TextGenerationStreamOutputSimplified`와 호환되지 않음
  - `routerMetadata.provider`가 `string`이 아닌 특정 리터럴 타입이어야 함

### MongoDB 관련 (47개 오류)

#### `src/lib/migrations/lock.ts`
- **라인 2**: `mongodb` 모듈을 찾을 수 없음
- **라인 13**: `_id` 속성이 `Semaphore` 타입에 존재하지 않음

#### `src/lib/migrations/routines/index.ts`
- **라인 1**: `mongodb` 모듈을 찾을 수 없음
- **라인 3**: `Database` 타입이 `$lib/server/database`에서 export되지 않음

#### `src/lib/migrations/migrations.ts`
- **라인 1**: `Database` 타입이 `$lib/server/database`에서 export되지 않음
- **라인 52**: 파라미터 `m`이 암시적으로 `any` 타입

#### `src/lib/migrations/migrations.spec.ts`
- **라인 32**: 파라미터 `r`이 암시적으로 `any` 타입

#### `src/lib/migrations/routines/01-update-search-assistants.ts`
- **라인 34**: `for await` 루프에 사용할 수 있는 async iterator가 없음
- **라인 52, 58**: `bulkWrite` 메서드가 `StubCollection`에 존재하지 않음
- **라인 65**: `updateMany` 메서드가 `StubCollection`에 존재하지 않음

#### `src/lib/migrations/routines/02-update-assistants-models.ts`
- **라인 27**: `map` 메서드가 존재하지 않음
- **라인 27**: 파라미터 `assistant`가 암시적으로 `any` 타입
- **라인 46**: `bulkWrite` 메서드가 `StubCollection`에 존재하지 않음

#### `src/lib/migrations/routines/04-update-message-updates.ts`
- **라인 143**: `tryNext` 메서드가 존재하지 않음

#### `src/lib/migrations/routines/05-update-message-files.ts`
- **라인 21**: `find` 메서드에 2개의 인수가 전달되었지만 0-1개만 허용됨
- **라인 24**: `tryNext` 메서드가 존재하지 않음

#### `src/lib/migrations/routines/06-trim-message-updates.ts`
- **라인 46**: `tryNext` 메서드가 존재하지 않음

#### `src/lib/migrations/routines/08-update-featured-to-review.ts`
- **라인 20, 21, 26**: `updateMany` 메서드가 `StubCollection<Assistant>`에 존재하지 않음
- **라인 29, 30, 32**: `updateMany` 메서드가 `StubCollection<unknown>`에 존재하지 않음

#### `src/lib/migrations/routines/09-delete-empty-conversations.ts`
- **라인 75, 83**: `batchSize` 메서드가 존재하지 않음
- **라인 78, 87, 94, 96**: 파라미터가 `unknown` 타입
- **라인 79, 97**: `StubCollection`이 `Collection` 타입에 할당 불가

#### `src/lib/migrations/routines/09-delete-empty-conversations.spec.ts`
- **라인 4**: `mongodb` 모듈을 찾을 수 없음
- **라인 51, 64, 74, 85, 96, 107, 118**: `_id`, `sessionId`, `userId` 속성이 `Conversation` 타입에 존재하지 않음
- **라인 138**: `id` 속성이 누락됨
- **라인 187**: `insertMany` 메서드가 `StubCollection`에 존재하지 않음

#### `src/lib/migrations/routines/10-update-reports-assistantid.ts`
- **라인 16**: `updateMany` 메서드가 `StubCollection<Report>`에 존재하지 않음

#### `src/lib/utils/tree/treeHelpers.spec.ts`
- **라인 2**: `mongodb` 모듈을 찾을 수 없음
- **라인 9, 43, 86**: `_id` 속성이 `Conversation` 타입에 존재하지 않음

#### `src/lib/utils/tree/addSibling.spec.ts`
- **라인 2**: `mongodb` 모듈을 찾을 수 없음
- **라인 23**: `_id`가 `keyof Conversation`에 할당 불가

#### `src/lib/utils/tree/addChildren.spec.ts`, `buildSubtree.spec.ts`, `convertLegacyConversation.spec.ts`
- 각 파일: `mongodb` 모듈을 찾을 수 없음

### ConfigProxy 타입 오류 (15개 오류)

#### `src/lib/server/sendSlack.ts`
- **라인 5, 10**: `WEBHOOK_URL_REPORT_ASSISTANT` 속성이 `ConfigProxy`에 존재하지 않음

#### `src/lib/server/usageLimits.ts`
- **라인 20**: `RATE_LIMIT` 속성이 `ConfigProxy`에 존재하지 않음
- **라인 29**: `USAGE_LIMITS` 속성이 `ConfigProxy`에 존재하지 않음

#### `src/lib/server/router/policy.ts`
- **라인 9**: `LLM_ROUTER_ROUTES_PATH` 속성이 `ConfigProxy`에 존재하지 않음

#### `src/lib/server/router/arch.ts`
- **라인 85**: `LLM_ROUTER_MAX_ASSISTANT_LENGTH` 속성이 `ConfigProxy`에 존재하지 않음
- **라인 86**: `LLM_ROUTER_MAX_PREV_USER_LENGTH` 속성이 `ConfigProxy`에 존재하지 않음
- **라인 158**: `LLM_ROUTER_ARCH_BASE_URL` 속성이 `ConfigProxy`에 존재하지 않음
- **라인 159**: `LLM_ROUTER_ARCH_MODEL` 속성이 `ConfigProxy`에 존재하지 않음
- **라인 179**: `LLM_ROUTER_ARCH_TIMEOUT_MS` 속성이 `ConfigProxy`에 존재하지 않음
- **라인 223**: `LLM_ROUTER_OTHER_ROUTE` 속성이 `ConfigProxy`에 존재하지 않음

#### `src/lib/server/router/endpoint.ts`
- **라인 119**: `LLM_ROUTER_ENABLE_MULTIMODAL` 속성이 `ConfigProxy`에 존재하지 않음
- **라인 179**: `LLM_ROUTER_MULTIMODAL_MODEL` 속성이 `ConfigProxy`에 존재하지 않음
- **라인 260**: `LLM_ROUTER_FALLBACK_MODEL` 속성이 `ConfigProxy`에 존재하지 않음

### Security API 관련 (5개 오류)

#### `src/lib/server/security/securityApi.ts`
- **라인 164**: `"NONE"` 타입이 `"AIM" | "APRISM" | null`에 할당 불가
- **라인 253, 254**: `msg.content`가 `never` 타입으로 추론됨
- **라인 253, 254**: 파라미터 `item`이 암시적으로 `any` 타입

### TypeScript 타입 호환성 오류 (35개 오류)

#### `src/lib/types/ConvSidebar.ts`
- **라인 1**: `bson` 모듈에 대한 선언 파일을 찾을 수 없음

#### `src/routes/conversation/+server.ts`
- **라인 46, 56**: 타입 변환이 위험할 수 있음 (`undefined`로 변환)
- **라인 69, 76**: `model`이 `undefined`일 수 있음

#### `src/routes/conversation/[id]/+server.ts`
- **라인 575, 626**: `error()` 함수 호출 시 `type` 속성이 `Error` 타입에 존재하지 않음
- **라인 594, 600, 607, 822, 824, 827, 834**: `data` 속성이 존재하지 않음
- **라인 868**: `securityProxiedData` 속성이 `MessageDebugUpdate` 타입에 존재하지 않음

#### `src/routes/+layout.svelte`
- **라인 140**: `welcomeModalSeenAt`, `welcomeModalSeen` 속성이 누락됨

#### `src/routes/+page.svelte`
- **라인 157, 170**: `Model[]` 타입과 호환되지 않음 (`parameters` 속성 불일치)

#### `src/routes/conversation/[id]/+page.svelte`
- **라인 280, 292, 387, 394, 454, 513, 598, 613**: `string | undefined`가 `string`에 할당 불가
- **라인 381, 678**: `title`, `id` 속성이 `never` 타입에 존재하지 않음
- **라인 701, 702**: `Model[]` 타입과 호환되지 않음

#### `src/routes/models/[...model]/+page.svelte`
- **라인 40**: `undefined`를 인덱스 타입으로 사용할 수 없음
- **라인 158, 159**: `Model[]` 타입과 호환되지 않음

#### `src/routes/privacy/+page.svelte`
- **라인 11**: `string | Promise<string>`이 `string`에 할당 불가

#### `src/routes/settings/(nav)/[...model]/+page.svelte`
- **라인 33, 48, 54**: `string | undefined`가 `string`에 할당 불가
- **라인 37, 72, 247, 259, 277, 293**: `undefined`를 인덱스 타입으로 사용할 수 없음

### Svelte 컴포넌트 오류 (19개 오류)

#### `src/lib/components/BackgroundGenerationPoller.svelte`
- **라인 73**: `messages` 속성이 `{}` 타입에 존재하지 않음
- **라인 79, 83**: 파라미터 `update`가 암시적으로 `any` 타입

#### `src/lib/components/ShareConversationModal.svelte`
- **라인 29**: `string | undefined`가 `string`에 할당 불가

#### `src/lib/components/chat/ChatMessage.svelte`
- **라인 139**: `loading` 속성이 `Props` 타입에 존재하지 않음

## 경고 (1개)

### `src/routes/settings/(nav)/application/+page.svelte`
- **라인 221**: 폼 레이블이 컨트롤과 연결되지 않음 (접근성 경고)

## 권장 수정 사항

### 우선순위 1: MongoDB 타입 문제 해결
1. `mongodb` 패키지 타입 선언 추가 또는 `@types/mongodb` 설치
2. `StubCollection` 타입을 실제 MongoDB `Collection` 타입과 호환되도록 수정
3. `Database` 타입 export 추가 또는 import 경로 수정

### 우선순위 2: ConfigProxy 타입 정의 보완
1. 모든 환경 변수 속성을 `ConfigProxy` 타입에 추가
2. 선택적 속성은 `?`로 표시하거나 기본값 처리

### 우선순위 3: Elysia API 통합 타입 수정
1. Elysia 컨텍스트에 `locals`, `error` 속성 추가
2. Cookie 타입 호환성 문제 해결
3. `TextGenerationStreamOutput` 타입 정렬

### 우선순위 4: TypeScript 타입 안전성 개선
1. `undefined` 체크 추가 또는 non-null assertion 사용
2. `Model` 타입의 `parameters` 속성 정의 정리
3. `Conversation` 타입에 누락된 속성 추가 (`_id`, `sessionId`, `userId` 등)

### 우선순위 5: Svelte 컴포넌트 타입 수정
1. Props 타입 정의 보완
2. 암시적 `any` 타입 제거
3. `undefined` 처리 로직 추가

## 참고 사항

- 대부분의 오류는 타입 정의 불일치로 인한 것입니다.
- MongoDB 관련 오류는 테스트 환경에서만 발생할 수 있습니다 (StubCollection 사용).
- 일부 오류는 런타임에는 문제가 없을 수 있으나, 타입 안전성을 위해 수정이 권장됩니다.

