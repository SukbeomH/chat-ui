# CSV 내보내기 기능 구현 계획

## 📋 개요

채팅 내역과 Debug 정보를 CSV 형태로 내보내는 기능을 구현합니다. 이 기능을 통해 IndexedDB에 저장된 대화 데이터를 Microsoft Excel과 같은 도구에서 분석할 수 있습니다.

## ✅ 사전 검증 완료 사항

### 1. Message.updates 배열의 MessageDebugUpdate 포함 여부
- **상태**: ✅ 저장됨
- **위치**: `src/routes/conversation/[id]/+page.svelte:350-352`
- **설명**: 고빈도 업데이트(Stream, KeepAlive)를 제외하고 저장되며, `MessageDebugUpdate`는 저장됩니다.

### 2. MessageDebugUpdate.securityProxiedData 전체 구조
- **상태**: ✅ 저장됨
- **위치**: `src/routes/conversation/[id]/+server.ts:890`
- **설명**: `securityProxiedData: securityApiResult.securityProxiedData`로 전체 구조가 포함됩니다.

### 3. File 데이터 처리
- **방식**: `MessageFile.name`만 사용 (파일명만 CSV에 포함)

## 📊 CSV 구조 설계

### CSV 컬럼 정의

#### Conversation 정보 (9개 컬럼)
- Conversation ID
- Conversation Title
- Model
- Conversation Created At
- Conversation Updated At
- Preprompt
- User Agent
- Security API Enabled
- Security External API

#### Message 정보 (12개 컬럼)
- Message ID
- Message From
- Message Content
- Message Score
- Interrupted
- Message Created At
- Message Updated At
- Router Route
- Router Model
- Router Provider
- Ancestors (파이프 구분)
- Children (파이프 구분)

#### File 정보 (4개 컬럼)
- File Count
- File Names (파이프 구분)
- File Types (파이프 구분)
- File MIMEs (파이프 구분)

#### Debug 정보 기본 (9개 컬럼)
- Has Debug Info
- Input Security API Status
- Input Security API Action
- Input Security API Duration (ms)
- Output Security API Status
- Output Security API Action
- Output Security API Duration (ms)
- LLM Response Time (ms)
- Total Time (ms)

#### Error 정보 (3개 컬럼)
- Has Input Security Error
- Has Output Security Error
- Has Handler Error

#### JSON 데이터 (1개 컬럼)
- Debug Summary JSON (간소화된 요약 JSON)

**총 38개 컬럼**

### 데이터 형식 규칙

1. **날짜**: ISO 8601 형식 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
2. **배열**: 파이프(`|`)로 구분된 문자열
3. **JSON**: 큰따옴표 내 이스케이프된 JSON 문자열
4. **인코딩**: UTF-8 with BOM (Excel 호환성)
5. **구분자**: 쉼표(`,`), 값에 쉼표 포함 시 큰따옴표로 감싸기
6. **줄바꿈**: 메시지 내용 내 줄바꿈은 `\n` 또는 큰따옴표 내 보존

## 🏗️ 구현 계획

### Phase 1: 핵심 유틸리티 함수 구현 (1-2일)

#### 1.1 파일 구조
```
src/lib/utils/csvExport.ts
```

#### 1.2 구현 함수 목록

1. **`extractDebugInfo(message: Message): MessageDebugUpdate | null`**
   - Message에서 Debug 정보 추출
   - `securityProxiedData` 존재 여부 검증

2. **`arrayToString(arr: unknown[] | undefined): string`**
   - 배열을 파이프 구분 문자열로 변환

3. **`formatDate(date: Date | string | undefined): string`**
   - 날짜를 ISO 8601 형식으로 변환

4. **`jsonToCsvString(obj: unknown): string`**
   - JSON 객체를 CSV 안전 문자열로 변환

5. **`conversationToCsvRows(conversation: Conversation): string[][]`**
   - Conversation과 Message를 CSV 행 배열로 변환

6. **`escapeCsvCell(value: string): string`**
   - CSV 셀 값 이스케이프 처리 (RFC 4180)

7. **`generateCsv(rows: string[][], headers: readonly string[]): string`**
   - CSV 파일 내용 생성 (UTF-8 BOM 포함)

8. **`createCsvBlob(csvContent: string): Blob`**
   - CSV Blob 생성

9. **`downloadCsv(csvContent: string, filename: string): void`**
   - 브라우저에서 CSV 파일 다운로드

### Phase 2: 내보내기 기능 통합 (1일)

#### 2.1 단일 대화 내보내기
- **함수**: `exportConversationToCsv(conversationId: string): Promise<void>`
- **기능**: 특정 대화를 CSV로 내보내기
- **파일명 형식**: `{제목}_{대화ID_8자리}_{날짜}.csv`

#### 2.2 전체 대화 내보내기
- **함수**: `exportAllConversationsToCsv(): Promise<void>`
- **기능**: 모든 대화를 하나의 CSV로 내보내기
- **파일명 형식**: `all_conversations_{날짜}.csv`

### Phase 3: UI 컴포넌트 추가 (1일)

#### 3.1 Settings 페이지
- **위치**: `src/routes/settings/(nav)/application/+page.svelte`
- **기능**: 전체 대화 내보내기 버튼 추가
- **UI 요소**:
  - Export 버튼
  - 로딩 상태 표시
  - 에러 메시지 표시

#### 3.2 대화 상세 페이지 (선택)
- **위치**: `src/routes/conversation/[id]/+page.svelte`
- **기능**: 현재 대화만 내보내기 버튼 추가

### Phase 4: 테스트 및 검증 (1일)

#### 4.1 기능 테스트
- [ ] 단일 대화 내보내기 테스트
- [ ] 전체 대화 내보내기 테스트
- [ ] 빈 대화 처리 테스트
- [ ] Debug 정보 없는 메시지 처리 테스트

#### 4.2 Excel 호환성 테스트
- [ ] UTF-8 BOM으로 한글 표시 확인
- [ ] 모든 컬럼이 올바르게 표시되는지 확인
- [ ] 특수 문자(쉼표, 줄바꿈, 큰따옴표) 처리 확인
- [ ] 날짜 형식 인식 확인

#### 4.3 대용량 데이터 테스트
- [ ] 많은 메시지가 있는 대화 처리
- [ ] 많은 대화가 있는 경우 처리
- [ ] 메모리 사용량 확인

### Phase 5: 문서화 (0.5일)

#### 5.1 사용자 가이드
- CSV 내보내기 방법 안내
- Excel에서 열기 방법 안내

#### 5.2 개발자 문서
- 함수 API 문서
- CSV 구조 상세 설명

## 📝 구현 상세 사양

### extractDebugInfo 함수

```typescript
export function extractDebugInfo(message: Message): MessageDebugUpdate | null {
  const debugUpdates = message.updates?.filter(
    (update): update is MessageDebugUpdate => update.type === MessageUpdateType.Debug
  );
  
  if (!debugUpdates || debugUpdates.length === 0) {
    return null;
  }
  
  // 마지막 Debug 업데이트가 가장 완전한 정보를 포함
  const lastDebugUpdate = debugUpdates[debugUpdates.length - 1];
  
  // securityProxiedData 존재 여부 확인 (경고만, 에러 아님)
  if (!lastDebugUpdate.securityProxiedData) {
    console.warn(`Message ${message.id} has Debug update but no securityProxiedData`);
  }
  
  return lastDebugUpdate;
}
```

### conversationToCsvRows 함수 주요 로직

1. Conversation 메타데이터 추출
2. 각 Message에 대해:
   - 기본 정보 추출
   - File 정보 추출 (파일명만)
   - Router 정보 추출
   - Debug 정보 추출
   - CSV 행 생성
3. 모든 행 반환

### CSV 생성 규칙 (RFC 4180)

1. **셀 값에 쉼표, 줄바꿈, 큰따옴표가 있으면**:
   - 큰따옴표로 감싸기
   - 내부 큰따옴표는 `""`로 이중화

2. **UTF-8 BOM 추가**:
   - Excel에서 UTF-8 인식용
   - `\uFEFF` 문자 추가

3. **줄바꿈**:
   - 행 구분: `\n`
   - 셀 내 줄바꿈: 큰따옴표 내 보존

## 🔍 검증 체크리스트

### 구현 전 확인
- [x] `Message.updates` 배열에 `MessageDebugUpdate` 저장 확인
- [x] `securityProxiedData` 전체 구조 포함 확인
- [x] File 데이터 처리 방식 결정 (파일명만)

### 구현 후 확인
- [ ] 실제 데이터로 CSV 생성 테스트
- [ ] Excel에서 모든 열이 올바르게 표시되는지 확인
- [ ] 한글 제목/내용이 깨지지 않는지 확인
- [ ] Debug 정보가 누락되지 않는지 확인
- [ ] 대용량 데이터 처리 성능 확인
- [ ] 에러 핸들링 동작 확인

## 📚 참고 자료

### 웹 레퍼런스
- [MDN IndexedDB 사용하기](https://developer.mozilla.org/ko/docs/Web/API/IndexedDB_API/Using_IndexedDB)
- [RFC 4180 - CSV 표준](https://tools.ietf.org/html/rfc4180)
- [Microsoft Excel CSV 가져오기](https://support.microsoft.com/ko-kr/office/%ED%85%8D%EC%8A%A4%ED%8A%B8-txt-%EB%98%90%EB%8A%94-csv-%ED%8C%8C%EC%9D%BC-%EA%B0%80%EC%A0%B8%EC%98%A4%EA%B8%B0-%EB%98%90%EB%8A%94-%EB%82%B4%EB%B3%B4%EB%82%B4%EA%B8%B0-5250ac4c-663c-47ce-937b-339e391393ba)

### 유사 사례
- ChatGPT Export: 대화 내보내기 기능
- Slack Export: 메시지 단위 CSV 내보내기
- Discord Chat Exporter: 멀티 CSV 방식

## 🚀 예상 소요 시간

- **Phase 1**: 1-2일 (핵심 유틸리티)
- **Phase 2**: 1일 (통합)
- **Phase 3**: 1일 (UI)
- **Phase 4**: 1일 (테스트)
- **Phase 5**: 0.5일 (문서화)

**총 예상 시간**: 4.5-5.5일

## 📌 주의사항

1. **메모리 관리**: 대용량 데이터 처리 시 스트리밍 고려
2. **에러 핸들링**: IndexedDB 접근 실패, 파일 다운로드 실패 등 처리
3. **사용자 경험**: 내보내기 진행 상태 표시
4. **성능**: 많은 대화가 있는 경우 처리 시간 고려

