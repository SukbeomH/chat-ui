# CSV 내보내기 기능 실행 단계별 가이드

## 📋 실행 전 준비사항

### 필수 확인 사항
- [ ] 프로젝트가 정상적으로 빌드되는지 확인
- [ ] IndexedDB에 테스트용 대화 데이터가 있는지 확인
- [ ] 개발 환경이 실행 중인지 확인

### 필요한 도구
- TypeScript 컴파일러
- 브라우저 개발자 도구
- Excel 또는 Google Sheets (테스트용)

---

## 🚀 Phase 1: 핵심 유틸리티 함수 구현

### Step 1.1: 파일 생성 및 기본 구조 설정

**작업**: `src/lib/utils/csvExport.ts` 파일 생성

**실행 명령**:
```bash
touch src/lib/utils/csvExport.ts
```

**파일 초기 내용**:
```typescript
import type { Conversation } from "$lib/types/Conversation";
import type { Message } from "$lib/types/Message";
import type { MessageDebugUpdate } from "$lib/types/MessageUpdate";
import { MessageUpdateType } from "$lib/types/MessageUpdate";

// TODO: 함수 구현
```

**검증**: 파일이 생성되었는지 확인

---

### Step 1.2: CSV_COLUMNS 상수 정의

**작업**: CSV 컬럼 헤더 정의

**구현 위치**: `src/lib/utils/csvExport.ts` 상단

**코드**:
```typescript
export const CSV_COLUMNS = [
  // Conversation 정보
  'Conversation ID',
  'Conversation Title',
  'Model',
  'Conversation Created At',
  'Conversation Updated At',
  'Preprompt',
  'User Agent',
  'Security API Enabled',
  'Security External API',
  
  // Message 정보
  'Message ID',
  'Message From',
  'Message Content',
  'Message Score',
  'Interrupted',
  'Message Created At',
  'Message Updated At',
  'Router Route',
  'Router Model',
  'Router Provider',
  'Ancestors',
  'Children',
  
  // File 정보
  'File Count',
  'File Names',
  'File Types',
  'File MIMEs',
  
  // Debug 정보 기본
  'Has Debug Info',
  'Input Security API Status',
  'Input Security API Action',
  'Input Security API Duration (ms)',
  'Output Security API Status',
  'Output Security API Action',
  'Output Security API Duration (ms)',
  'LLM Response Time (ms)',
  'Total Time (ms)',
  
  // Error 정보
  'Has Input Security Error',
  'Has Output Security Error',
  'Has Handler Error',
  
  // JSON 데이터
  'Debug Summary JSON',
] as const;
```

**검증**: TypeScript 컴파일 오류 없음 확인

---

### Step 1.3: extractDebugInfo 함수 구현

**작업**: Message에서 Debug 정보 추출

**구현 위치**: `src/lib/utils/csvExport.ts`

**코드**:
```typescript
/**
 * Message에서 MessageDebugUpdate 추출 및 검증
 */
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

**검증**: 
- 함수가 정상적으로 컴파일되는지 확인
- 타입 체크 통과 확인

---

### Step 1.4: 헬퍼 함수들 구현

**작업**: 배열, 날짜, JSON 변환 헬퍼 함수 구현

**구현 위치**: `src/lib/utils/csvExport.ts`

**코드**:
```typescript
/**
 * 배열을 파이프(|)로 구분된 문자열로 변환
 */
function arrayToString(arr: unknown[] | undefined): string {
  if (!arr || arr.length === 0) return '';
  return arr.map(item => String(item)).join('|');
}

/**
 * 날짜를 ISO 8601 형식으로 변환
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

/**
 * JSON 객체를 안전하게 문자열로 변환 (CSV 내 포함용)
 */
function jsonToCsvString(obj: unknown): string {
  if (!obj) return '';
  try {
    return JSON.stringify(obj).replace(/"/g, '""'); // CSV 내 큰따옴표 이스케이프
  } catch {
    return '';
  }
}
```

**검증**: 각 함수가 정상 동작하는지 단위 테스트 작성 (선택)

---

### Step 1.5: conversationToCsvRows 함수 구현

**작업**: Conversation을 CSV 행 배열로 변환

**구현 위치**: `src/lib/utils/csvExport.ts`

**주의사항**: 
- 모든 필드를 빠짐없이 포함
- null/undefined 처리
- 배열 데이터는 파이프 구분

**검증**:
- [ ] TypeScript 컴파일 오류 없음
- [ ] 모든 컬럼이 포함되는지 확인
- [ ] 빈 값 처리 확인

---

### Step 1.6: CSV 생성 함수들 구현

**작업**: CSV 포맷팅 및 다운로드 함수 구현

**구현 위치**: `src/lib/utils/csvExport.ts`

**코드**:
```typescript
/**
 * CSV 셀 값 이스케이프 처리 (RFC 4180)
 */
function escapeCsvCell(value: string): string {
  // 값에 쉼표, 줄바꿈, 큰따옴표가 있으면 큰따옴표로 감싸고 내부 큰따옴표는 이중화
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * CSV 파일 생성 (UTF-8 with BOM for Excel compatibility)
 */
export function generateCsv(rows: string[][], headers: readonly string[]): string {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const lines: string[] = [];
  
  // 헤더 추가
  lines.push(headers.map(escapeCsvCell).join(','));
  
  // 데이터 행 추가
  for (const row of rows) {
    lines.push(row.map(cell => escapeCsvCell(String(cell ?? ''))).join(','));
  }
  
  return BOM + lines.join('\n');
}

/**
 * Blob으로 변환하여 다운로드 준비
 */
export function createCsvBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * 브라우저에서 CSV 파일 다운로드
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = createCsvBlob(csvContent);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

**검증**:
- [ ] CSV 생성 함수가 올바른 형식으로 생성하는지 확인
- [ ] BOM이 포함되는지 확인
- [ ] 특수 문자 이스케이프가 올바른지 확인

---

## 🔗 Phase 2: 내보내기 기능 통합

### Step 2.1: 단일 대화 내보내기 함수 구현

**작업**: `exportConversationToCsv` 함수 구현

**구현 위치**: `src/lib/utils/csvExport.ts`

**코드**:
```typescript
import { storage } from "$lib/storage/indexedDB";

/**
 * 단일 대화를 CSV로 내보내기
 */
export async function exportConversationToCsv(conversationId: string): Promise<void> {
  const conversation = await storage.getConversation(conversationId);
  
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }
  
  const rows = conversationToCsvRows(conversation);
  const csvContent = generateCsv(rows, CSV_COLUMNS);
  
  // 파일명 생성: 제목-대화ID-날짜.csv
  const sanitizedTitle = conversation.title.replace(/[^a-zA-Z0-9가-힣]/g, '_').substring(0, 50);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${sanitizedTitle}_${conversationId.substring(0, 8)}_${dateStr}.csv`;
  
  downloadCsv(csvContent, filename);
}
```

**검증**:
- [ ] 함수가 정상적으로 컴파일되는지 확인
- [ ] 브라우저 콘솔에서 직접 호출하여 테스트 (선택)

---

### Step 2.2: 전체 대화 내보내기 함수 구현

**작업**: `exportAllConversationsToCsv` 함수 구현

**구현 위치**: `src/lib/utils/csvExport.ts`

**코드**:
```typescript
/**
 * 모든 대화를 하나의 CSV로 내보내기
 */
export async function exportAllConversationsToCsv(): Promise<void> {
  const conversations = await storage.getConversations();
  
  if (conversations.length === 0) {
    throw new Error('No conversations found');
  }
  
  const allRows: string[][] = [];
  
  for (const conversation of conversations) {
    const rows = conversationToCsvRows(conversation);
    allRows.push(...rows);
  }
  
  const csvContent = generateCsv(allRows, CSV_COLUMNS);
  
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `all_conversations_${dateStr}.csv`;
  
  downloadCsv(csvContent, filename);
}
```

**검증**:
- [ ] 함수가 정상적으로 컴파일되는지 확인
- [ ] 빈 대화 목록 처리 확인

---

## 🎨 Phase 3: UI 컴포넌트 추가

### Step 3.1: Settings 페이지에 내보내기 버튼 추가

**작업**: Settings 페이지에 전체 대화 내보내기 UI 추가

**파일**: `src/routes/settings/(nav)/application/+page.svelte`

**작업 순서**:
1. 파일 열기
2. import 문 추가
3. 상태 변수 추가
4. 내보내기 함수 추가
5. UI 버튼 추가

**검증**:
- [ ] 버튼이 표시되는지 확인
- [ ] 클릭 시 다운로드가 시작되는지 확인
- [ ] 로딩 상태가 표시되는지 확인
- [ ] 에러 메시지가 표시되는지 확인

---

### Step 3.2: 대화 상세 페이지에 내보내기 버튼 추가 (선택)

**작업**: 현재 대화만 내보내기 버튼 추가

**파일**: `src/routes/conversation/[id]/+page.svelte`

**검증**:
- [ ] 버튼이 표시되는지 확인
- [ ] 클릭 시 현재 대화만 다운로드되는지 확인

---

## 🧪 Phase 4: 테스트 및 검증

### Step 4.1: 단위 테스트

**작업**: 핵심 함수들의 단위 테스트 작성

**테스트 항목**:
- [ ] `extractDebugInfo` - Debug 정보 추출 테스트
- [ ] `conversationToCsvRows` - 행 변환 테스트
- [ ] `escapeCsvCell` - 특수 문자 이스케이프 테스트
- [ ] `generateCsv` - CSV 생성 테스트

**실행 방법**:
```bash
npm test
```

---

### Step 4.2: 통합 테스트

**작업**: 실제 데이터로 내보내기 테스트

**테스트 시나리오**:
1. **단일 대화 내보내기**
   - [ ] Debug 정보가 있는 대화
   - [ ] Debug 정보가 없는 대화
   - [ ] 파일이 첨부된 메시지가 있는 대화
   - [ ] 빈 대화

2. **전체 대화 내보내기**
   - [ ] 여러 대화가 있는 경우
   - [ ] 대화가 없는 경우

**검증 항목**:
- [ ] CSV 파일이 다운로드되는지 확인
- [ ] 파일명이 올바른지 확인
- [ ] 파일 크기가 0이 아닌지 확인

---

### Step 4.3: Excel 호환성 테스트

**작업**: Excel에서 CSV 파일 열기 테스트

**테스트 항목**:
- [ ] UTF-8 BOM으로 한글이 올바르게 표시되는지
- [ ] 모든 컬럼이 올바르게 표시되는지
- [ ] 날짜 형식이 올바르게 인식되는지
- [ ] 특수 문자(쉼표, 줄바꿈, 큰따옴표)가 올바르게 표시되는지
- [ ] 파이프 구분 배열이 올바르게 표시되는지
- [ ] JSON 데이터가 올바르게 표시되는지

**실행 방법**:
1. CSV 파일 다운로드
2. Excel에서 열기
3. 각 항목 확인

---

### Step 4.4: 성능 테스트

**작업**: 대용량 데이터 처리 테스트

**테스트 시나리오**:
- [ ] 많은 메시지가 있는 대화 (100개 이상)
- [ ] 많은 대화가 있는 경우 (50개 이상)
- [ ] 메모리 사용량 확인

**검증 항목**:
- [ ] 처리 시간이 합리적인지 (10초 이내 권장)
- [ ] 메모리 사용량이 과도하지 않은지
- [ ] 브라우저가 멈추지 않는지

---

## 📚 Phase 5: 문서화

### Step 5.1: 사용자 가이드 작성

**작업**: CSV 내보내기 사용 방법 문서 작성

**내용**:
- 내보내기 버튼 위치
- 내보내기 방법
- Excel에서 열기 방법
- CSV 파일 구조 설명

**위치**: README.md 또는 별도 문서

---

### Step 5.2: 개발자 문서 작성

**작업**: 함수 API 문서 작성

**내용**:
- 각 함수의 설명
- 파라미터 설명
- 반환값 설명
- 사용 예제

**위치**: 코드 주석 또는 별도 문서

---

## 🔍 문제 해결 가이드

### 일반적인 문제

#### 1. TypeScript 컴파일 오류
**증상**: 타입 오류 발생
**해결**: 
- 타입 정의 확인
- import 경로 확인
- 타입 단언 필요 시 `as` 사용

#### 2. CSV 파일이 Excel에서 깨짐
**증상**: 한글이 깨져서 표시됨
**해결**:
- UTF-8 BOM 확인 (`\uFEFF` 포함 여부)
- Excel에서 "데이터 > 텍스트/CSV에서 가져오기" 사용

#### 3. 다운로드가 시작되지 않음
**증상**: 버튼 클릭해도 다운로드 안 됨
**해결**:
- 브라우저 콘솔에서 에러 확인
- `downloadCsv` 함수 호출 확인
- Blob 생성 확인

#### 4. 메모리 부족
**증상**: 많은 대화 내보내기 시 브라우저 멈춤
**해결**:
- 스트리밍 방식으로 변경 고려
- 청크 단위로 처리
- 진행 상태 표시 추가

---

## ✅ 완료 체크리스트

### Phase 1 완료
- [ ] `csvExport.ts` 파일 생성
- [ ] `CSV_COLUMNS` 정의
- [ ] `extractDebugInfo` 구현
- [ ] 헬퍼 함수들 구현
- [ ] `conversationToCsvRows` 구현
- [ ] CSV 생성 함수들 구현

### Phase 2 완료
- [ ] `exportConversationToCsv` 구현
- [ ] `exportAllConversationsToCsv` 구현

### Phase 3 완료
- [ ] Settings 페이지에 UI 추가
- [ ] 대화 상세 페이지에 UI 추가 (선택)

### Phase 4 완료
- [ ] 단위 테스트 작성 및 통과
- [ ] 통합 테스트 완료
- [ ] Excel 호환성 테스트 완료
- [ ] 성능 테스트 완료

### Phase 5 완료
- [ ] 사용자 가이드 작성
- [ ] 개발자 문서 작성

---

## 🚀 빠른 시작 가이드

### 최소 구현 (기본 기능만)

1. **Step 1.1-1.6**: 핵심 유틸리티 함수 구현
2. **Step 2.1-2.2**: 내보내기 함수 구현
3. **Step 3.1**: Settings 페이지에 버튼 추가
4. **Step 4.2**: 기본 통합 테스트

**예상 시간**: 2-3일

### 완전한 구현 (모든 기능)

모든 Phase를 순서대로 진행

**예상 시간**: 4.5-5.5일

---

## 📝 참고사항

- 각 Step을 완료한 후 커밋하는 것을 권장
- 테스트는 단계별로 진행하여 문제를 조기에 발견
- Excel 호환성은 실제 Excel에서 테스트하는 것이 중요
- 대용량 데이터 처리는 성능 최적화 고려 필요

