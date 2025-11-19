# Pre-commit Hook 오류 원인 분석

## 문제 현상

Git 커밋 시 pre-commit hook에서 ESLint 오류가 발생하여 커밋이 실패합니다:

```
✖ eslint --fix:
/Users/sukbeom/Desktop/workspace/huggingface-ui/src/lib/server/security/securityApi.ts
  190:69  error  'HeadersInit' is not defined  no-undef
  191:17  error  'HeadersInit' is not defined  no-undef
  ...
```

## 근본 원인

### 1. ESLint 설정 우선순위 문제

현재 `.eslintrc.cjs` 설정:

```javascript
extends: [
  "plugin:@typescript-eslint/recommended",
  "plugin:svelte/recommended",
  "eslint:recommended",  // ← 이 설정이 문제
  "prettier",
],
overrides: [
  {
    files: ["*.ts", "*.tsx"],
    rules: {
      "no-undef": "off",  // ← 이 설정이 적용되지 않음
    },
  },
],
rules: {
  "no-undef": "off",  // ← 이것도 적용되지 않음
},
```

**문제점:**
- `eslint:recommended`가 `no-undef: "error"`를 강제로 설정합니다
- ESLint의 설정 병합 순서에서 `extends`의 설정이 `overrides`보다 우선순위가 높을 수 있습니다
- 실제로 `npx eslint --print-config`로 확인 시 `no-undef`가 여전히 `2` (error)로 설정되어 있습니다

### 2. TypeScript 타입 인식 문제

TypeScript 파일에서 사용하는 Web API 타입들(`HeadersInit`, `AbortSignal`, `Request`, `Response` 등)이:
- TypeScript 컴파일러는 정상적으로 인식 (타입 체크 통과)
- ESLint는 `no-undef` 규칙으로 인해 오류로 판단

이는 TypeScript와 ESLint의 역할 중복입니다:
- **TypeScript**: 타입 체크 및 컴파일 타임 오류 검출
- **ESLint**: 코드 품질 및 스타일 검사

TypeScript 파일에서는 TypeScript 컴파일러가 이미 타입 체크를 수행하므로, ESLint의 `no-undef` 규칙은 불필요합니다.

### 3. Pre-commit Hook 구조

```
.husky/pre-commit
  └─> npx lint-staged --config ./.husky/lint-stage-config.js
      └─> .husky/lint-stage-config.js
          └─> "*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --fix", "eslint"]
```

lint-staged가 스테이징된 파일에 대해 ESLint를 실행하며, 오류가 있으면 커밋을 중단합니다.

## 해결 방안

### 방안 1: `eslint:recommended`에서 `no-undef` 제외 (권장)

`eslint:recommended`를 사용하지 않고 필요한 규칙만 명시적으로 추가:

```javascript
extends: [
  "plugin:@typescript-eslint/recommended",
  "plugin:svelte/recommended",
  // "eslint:recommended" 제거
  "prettier",
],
rules: {
  // eslint:recommended의 주요 규칙만 선택적으로 추가
  "no-unused-vars": "off",  // @typescript-eslint/no-unused-vars 사용
  "@typescript-eslint/no-unused-vars": "error",
  "no-undef": "off",  // TypeScript가 타입 체크 수행
  // ... 기타 필요한 규칙
},
```

### 방안 2: `overrides` 우선순위 강제

`overrides`를 더 명시적으로 설정하고, `extends` 순서 조정:

```javascript
extends: [
  "plugin:@typescript-eslint/recommended",
  "plugin:svelte/recommended",
  "prettier",
  // eslint:recommended를 마지막에 배치하여 overrides가 우선되도록
],
overrides: [
  {
    files: ["*.ts", "*.tsx"],
    extends: ["plugin:@typescript-eslint/recommended"],
    rules: {
      "no-undef": "off",
    },
  },
],
```

### 방안 3: TypeScript 전용 ESLint 설정 사용

`@typescript-eslint/recommended`는 이미 `no-undef`를 비활성화하도록 설계되었지만, `eslint:recommended`가 이를 덮어쓰고 있습니다.

### 방안 4: Pre-commit Hook 수정 (임시 해결책)

TypeScript 파일에 대해서만 `no-undef` 오류를 무시하도록 lint-staged 설정 수정:

```javascript
// .husky/lint-stage-config.js
export default {
  "*.{js,jsx}": ["prettier --write", "eslint --fix", "eslint"],
  "*.{ts,tsx}": [
    "prettier --write",
    "eslint --fix --rule 'no-undef: off'",
    "eslint --rule 'no-undef: off'",
  ],
  "*.json": ["prettier --write"],
};
```

## 권장 해결책

**방안 1을 권장합니다.** 이유:
1. TypeScript 프로젝트에서는 `eslint:recommended`의 `no-undef` 규칙이 불필요
2. `@typescript-eslint/recommended`가 이미 TypeScript에 최적화된 규칙 제공
3. 설정이 더 명확하고 유지보수하기 쉬움

## 현재 상태

현재는 `--no-verify` 플래그를 사용하여 커밋하고 있지만, 이는 임시 해결책입니다. 근본적인 해결을 위해 위의 방안 중 하나를 적용하는 것을 권장합니다.

## 참고 자료

- [ESLint Configuration Cascading and Hierarchy](https://eslint.org/docs/latest/use/configure/configuration-files#cascading-and-hierarchy)
- [TypeScript ESLint: no-undef](https://typescript-eslint.io/rules/no-undef/)
- [@typescript-eslint/recommended](https://typescript-eslint.io/getting-started/#configuration)

