# Security Proxy Handler 클라이언트 가이드

## 개요

Security Proxy Handler는 LiteLLM Proxy와 통합되어 LLM 요청 전후에 보안 검증을 수행하는 커스텀 핸들러입니다.

### 주요 기능

- **AIM Guard 통합**: 실시간 컨텐츠 모더레이션 (PII 탐지, 정책 위반 검사, 유해성 탐지)
- **aprism 통합**: PII 식별 및 마스킹 (Identifier API), 위험 탐지 (Risk Detector API)
- **입출력 검증**: input과 output을 독립적으로 검증 가능
- **파일 지원**: OpenAI API 형식의 파일 첨부 지원 (aprism: Base64 Data URL, AIM Guard: 텍스트만)
- **세부 응답 필드**: 구조화된 세부 정보 제공 (`aim_guard_details`, `aprism_details`)
- **성능 측정**: 보안 API 호출 및 LLM 호출 시간 측정

### 지원 보안 API

1. **AIM Guard**: 가드레일 기반 컨텐츠 모더레이션
2. **aprism**: 
   - Identifier API: PII 탐지 및 마스킹
   - Risk Detector API: 위험 탐지 (UNSAFE 시 차단)

## 요청 형식

### 엔드포인트

```
POST /v1/chat/completions
Content-Type: application/json
```

표준 OpenAI Chat Completions API와 동일한 엔드포인트를 사용합니다.

### 기본 요청 형식

Security Proxy Handler는 LiteLLM Proxy를 통해 동작하므로, 표준 OpenAI API 형식의 요청을 보냅니다.

## 헤더 설정

### 보안 API 선택 헤더

| 헤더 | 타입 | 필수 | 설명 | 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `x-external-api` | string | 선택 | 보안 API 선택: "AIM" 또는 "APRISM" | "AIM" |

**참고**: `x-external-api` 헤더가 없어도 API 키 헤더만 있으면 자동 감지됩니다.

### AIM Guard 헤더

| 헤더 | 타입 | 필수 | 설명 | 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `x-aim-guard-key` | string | 필수* | AIM Guard API 키 | "your-aim-guard-api-key" |
| `x-aim-guard-type` | string | 선택 | 검증 타입: "both" (기본값), "input", "output" | "both" |
| `x-aim-guard-project-id` | string | 선택 | 프로젝트 ID (기본값: "default") | "my-project" |

*`x-external-api=AIM` 또는 AIM Guard만 사용할 때 필수

### aprism 헤더

| 헤더 | 타입 | 필수 | 설명 | 예시 |
| :--- | :--- | :--- | :--- | :--- |
| `x-aprism-inference-key` | string | 필수* | aprism Inference API 키 | "your-aprism-api-key" |
| `x-aprism-api-type` | string | 선택 | API 타입: "identifier" (기본값), "risk-detector" | "risk-detector" |
| `x-aprism-type` | string | 선택 | 처리 타입: "both" (기본값), "input", "output" | "both" |
| `x-aprism-exclude-labels` | string | 선택 | 제외 라벨 목록 (콤마로 구분, Identifier 전용) | "EMAIL,PHONE_NUMBER" |

*`x-external-api=APRISM` 또는 aprism만 사용할 때 필수

### 헤더 우선순위

1. `x-external-api` 헤더 값이 명시되면 해당 API 사용 (최우선)
2. `x-external-api`가 없으면 API 키 헤더로 자동 감지:
   - `x-aim-guard-key`가 있으면 → AIM Guard
   - `x-aprism-inference-key`가 있으면 → aprism
   - **두 키가 모두 있으면 AIM Guard 우선** (elif 로직)

### 헤더 대소문자

모든 헤더는 대소문자를 구분하지 않습니다. 예: `x-aim-guard-key`와 `X-AIM-GUARD-KEY`는 동일하게 처리됩니다.

## 요청 본문 스키마

### 표준 OpenAI Chat Completions 형식

Security Proxy Handler는 표준 OpenAI API 요청 형식을 그대로 사용합니다.

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "사용자 메시지"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

### Messages 형식

#### 문자열 형식 (기본)

```json
{
  "role": "user",
  "content": "텍스트 메시지"
}
```

#### 배열 형식 (파일 첨부 지원)

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "텍스트 내용"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "data:image/jpeg;base64,..."
      }
    }
  ]
}
```

**주의**: 
- AIM Guard는 현재 텍스트만 지원합니다. content 배열이 포함된 경우, "text" 타입만 추출되어 전달되며, "image_url" 또는 "file" 타입은 건너뛰고 경고 로그가 출력됩니다.
- aprism은 Base64 Data URL 형식의 파일을 지원합니다. `{"type": "file", "data_url": "data:..."}` 형식으로 파일을 첨부하면 자동으로 업로드 및 파싱 후 S3 파일 기반 요청으로 변환됩니다.

## 응답 형식

### 표준 OpenAI 응답

Security Proxy Handler는 표준 OpenAI API 응답 구조를 유지하며, 추가 필드를 포함합니다.

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "LLM 응답 내용"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  },
  "security_proxied_data": {
    ...
  }
}
```

### security_proxied_data 구조

보안 검증 결과 및 메타데이터가 `security_proxied_data` 필드에 포함됩니다.

```json
{
  "original_request": {
    "model": "gpt-3.5-turbo",
    "messages": [...],
    "headers": {...},
    "metadata": {...}
  },
  "input_security_api_response": {
    "status": "success",
    "status_code": 200,
    "data": {
      "action": "NONE",
      "masked_text": "...",
      "processing_time": 0.5,
      ...
    },
    "timestamp": "2025-01-XX...",
    "timing": {
      "call_start": 1234567890.124,
      "call_end": 1234567890.625,
      "duration": 0.501
    }
  },
  "llm_request": {
    "model": "gpt-3.5-turbo",
    "messages": [...],
    "headers": {...},
    "metadata": {...}
  },
  "llm_response": {
    "id": "chatcmpl-...",
    "choices": [...],
    "usage": {...}
  },
  "output_security_api_response": {
    "status": "success",
    "status_code": 200,
    "data": {
      "action": "NONE",
      "masked_text": "...",
      ...
    },
    "timestamp": "2025-01-XX...",
    "timing": {
      "call_start": 1234567891.001,
      "call_end": 1234567891.502,
      "duration": 0.501
    }
  },
  "timing": {
    "pre_call_start": 1234567890.123,
    "input_security_api_call_start": 1234567890.124,
    "input_security_api_call_end": 1234567890.625,
    "input_security_api_duration": 0.501,
    "llm_call_start": 1234567890.626,
    "llm_call_end": 1234567891.000,
    "llm_call_duration": 0.374,
    "output_security_api_call_start": 1234567891.001,
    "output_security_api_call_end": 1234567891.502,
    "output_security_api_duration": 0.501,
    "total_duration": 1.379
  },
  "metadata": {
    "handler": "SecurityProxyHandler",
    "timestamp": "2025-01-XX..."
  },
  "aim_guard_details": {...},
  "aprism_details": {...}
}
```

**참고**: `aim_guard_details`와 `aprism_details`는 선택적 필드입니다. 사용하는 보안 API에 따라 해당 필드만 포함됩니다.

### security_proxied_data 필드 설명

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `original_request` | object | 원본 LLM 요청 데이터 (보안 API 헤더 제외) |
| `input_security_api_response` | object | input 보안 API 응답 (있는 경우) |
| `llm_request` | object | 보안 검증 후 LLM에 전달된 수정된 요청 (있는 경우) |
| `llm_response` | object | LLM 응답 데이터 |
| `output_security_api_response` | object | output 보안 API 응답 (있는 경우) |
| `timing` | object | 시간 측정 정보 (초 단위) |
| `metadata` | object | 메타데이터 |
| `input_security_api_error` | object | input 보안 API 호출 실패 시 에러 정보 (있는 경우) |
| `output_security_api_error` | object | output 보안 API 호출 실패 시 에러 정보 (있는 경우) |
| `handler_error` | object | handler 내부 오류 시 에러 정보 (있는 경우) |
| `aim_guard_details` | object | AIM Guard 세부 응답 필드 (AIM Guard 사용 시에만 포함) |
| `aprism_details` | object | aprism 세부 응답 필드 (aprism 사용 시에만 포함) |

**하위 호환성**: `external_api_response` 필드도 포함됩니다 (input 응답과 동일).

### 필드 포함 조건

각 필드는 다음 조건에 따라 포함됩니다:

| 필드 | 포함 조건 |
|:---|:---|
| `original_request` | 항상 포함 |
| `llm_response` | 항상 포함 |
| `timing` | 항상 포함 |
| `metadata` | 항상 포함 |
| `input_security_api_response` | input 검증 수행 시만 포함 |
| `llm_request` | input 검증 수행 시만 포함 |
| `output_security_api_response` | output 검증 수행 시만 포함 |
| `external_api_response` | input 검증 수행 시만 포함 (하위 호환성) |
| `input_security_api_error` | input 보안 API 호출 실패 시만 포함 |
| `output_security_api_error` | output 보안 API 호출 실패 시만 포함 |
| `handler_error` | handler 내부 오류 발생 시만 포함 |
| `aim_guard_details` | AIM Guard 사용 시에만 포함 |
| `aprism_details` | aprism 사용 시에만 포함 |

**참고**:
- `input_security_api_response`는 `x-{api}-type` 헤더가 "input" 또는 "both"일 때 포함됩니다.
- `llm_request`는 `input_security_api_response`가 포함될 때 함께 포함됩니다 (보안 검증 후 수정된 요청).
- `output_security_api_response`는 `x-{api}-type` 헤더가 "output" 또는 "both"일 때 포함됩니다.
- `input_security_api_error`는 input 보안 API 호출이 실패하거나 예외가 발생한 경우에만 포함됩니다.
- `output_security_api_error`는 output 보안 API 호출이 실패하거나 예외가 발생한 경우에만 포함됩니다.
- `handler_error`는 handler 내부에서 예외가 발생한 경우에만 포함됩니다.
- `aim_guard_details`와 `aprism_details`는 각각 해당 보안 API를 사용할 때만 포함되며, input/output 중 하나만 검증한 경우 해당 필드만 포함됩니다.

### timing 필드 설명

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `pre_call_start` | float | Pre-call hook 시작 시간 |
| `input_security_api_call_start` | float | Input 보안 API 호출 시작 시간 |
| `input_security_api_call_end` | float | Input 보안 API 호출 종료 시간 |
| `input_security_api_duration` | float | Input 보안 API 호출 소요 시간 |
| `llm_call_start` | float | LLM 호출 시작 시간 |
| `llm_call_end` | float | LLM 호출 종료 시간 |
| `llm_call_duration` | float | LLM 호출 소요 시간 |
| `output_security_api_call_start` | float | Output 보안 API 호출 시작 시간 (있는 경우) |
| `output_security_api_call_end` | float | Output 보안 API 호출 종료 시간 (있는 경우) |
| `output_security_api_duration` | float | Output 보안 API 호출 소요 시간 (있는 경우) |
| `total_duration` | float | 전체 처리 시간 |

## AIM Guard 응답 구조

### input_security_api_response / output_security_api_response

```json
{
  "status": "success",
  "status_code": 200,
  "data": {
    "action": "NONE",
    "detected_items_count": 0,
    "policy_violations_count": 0,
    "masked_text": "...",
    "processing_time": 0.5,
    "policy_enabled": ["ner", "regex", "banword", "topic"],
    "user_id": "user_abc123",
    "session_id": "session_xyz789",
    "input_sources": ["직접입력"],
    "policy_violations": [],
    "pii_detection": {},
    "detected_items": {}
  },
  "timestamp": "2025-01-XX...",
  "timing": {
    "call_start": 1234567890.124,
    "call_end": 1234567890.625,
    "duration": 0.501
  }
}
```

### Action 값

| Action | 설명 | 동작 |
| :--- | :--- | :--- |
| `NONE` | 조치 불필요 | 원본 요청/응답 유지 |
| `MASKING` | 마스킹 필요 | 마스킹된 텍스트로 대체 |
| `BLOCKING` | 차단 필요 | 요청 차단 (input) 또는 응답 차단 메시지 표시 (output) |

### aim_guard_details 필드

AIM Guard를 사용하는 경우, `security_proxied_data`에 `aim_guard_details` 필드가 추가됩니다. 이 필드는 AIM Guard 응답의 세부 정보를 구조화하여 제공합니다.

#### 구조

```json
{
  "aim_guard_details": {
    "input": {
      "detected_items": {...},
      "policy_violations": [],
      "pii_detection": {...},
      "detected_items_count": 2,
      "policy_violations_count": 1,
      "processing_time": 0.518,
      "policy_enabled": ["ner", "regex", "banword", "topic"],
      "input_sources": ["text"]
    },
    "output": {
      "detected_items": {...},
      "policy_violations": [],
      "pii_detection": {...},
      "detected_items_count": 0,
      "policy_violations_count": 0,
      "processing_time": 0.312,
      "policy_enabled": ["ner", "regex", "banword", "topic"],
      "input_sources": ["text"]
    }
  }
}
```

#### 필드 설명

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `input` | object | Input 검증 세부 정보 (input 검증이 수행된 경우에만 포함) |
| `output` | object | Output 검증 세부 정보 (output 검증이 수행된 경우에만 포함) |

#### input / output 객체 필드

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `detected_items` | object | 상세 탐지 정보 객체 (민감 정보 탐지 세부 내역) |
| `policy_violations` | array | 정책 위반 목록 (세부 객체 포함) |
| `pii_detection` | object | PII 탐지 결과 객체 |
| `detected_items_count` | integer | 민감정보에서 탐지된 항목 수 |
| `policy_violations_count` | integer | 정책 위반(주제)에서 탐지된 항목 수 |
| `processing_time` | float | AIM Guard 처리 시간 (초) |
| `policy_enabled` | array | 활성화된 가드 정책 목록 (예: `["ner", "regex", "banword", "topic"]`) |
| `input_sources` | array | 입력된 데이터 유형 정보 (예: `["text"]`, `["text", "image"]`) |

#### 사용 예시

`aim_guard_details` 필드는 모니터링, 로깅, 알림 등에 활용할 수 있습니다:

- **탐지 항목 수 확인**: `detected_items_count`와 `policy_violations_count`로 위험도 평가
- **정책 위반 분석**: `policy_violations` 배열에서 위반된 정책 상세 정보 확인
- **PII 탐지 분석**: `pii_detection` 객체에서 탐지된 PII 유형 및 위치 확인
- **성능 모니터링**: `processing_time`으로 AIM Guard 처리 성능 추적
- **정책 활성화 상태**: `policy_enabled`로 현재 활성화된 정책 확인

**참고**: 
- `aim_guard_details` 필드는 AIM Guard를 사용하는 경우에만 포함됩니다.
- aprism을 사용하는 경우 이 필드는 포함되지 않습니다.
- Input 또는 Output 중 하나만 검증한 경우, 해당하는 필드만 포함됩니다.

## aprism 응답 구조

### Identifier API 응답

#### input_security_api_response

```json
{
  "status": "success",
  "status_code": 200,
  "data": {
    "type": "identifier",
    "data": {
      "entities": [
        {
          "label": "PHONE_NUMBER",
          "text": "010-1234-5678",
          "start": 0,
          "end": 13,
          "score": 0.99
        }
      ],
      "abstracted": "전화번호는 PHONE_NUMBER 입니다",
      "original": "전화번호는 010-1234-5678 입니다"
    }
  },
  "timestamp": "2025-01-XX...",
  "timing": {
    "call_start": 1234567890.124,
    "call_end": 1234567890.625,
    "duration": 0.501
  }
}
```

#### output_security_api_response

Identifier API의 output 응답은 input과 동일한 구조를 가집니다:

```json
{
  "status": "success",
  "status_code": 200,
  "data": {
    "type": "identifier",
    "data": {
      "entities": [
        {
          "label": "EMAIL",
          "text": "test@example.com",
          "start": 10,
          "end": 28,
          "score": 0.95
        }
      ],
      "abstracted": "문의는 EMAIL로 연락주세요",
      "original": "문의는 test@example.com로 연락주세요"
    }
  },
  "timestamp": "2025-01-XX...",
  "timing": {
    "call_start": 1234567891.001,
    "call_end": 1234567891.502,
    "duration": 0.501
  }
}
```

### Risk Detector API 응답

#### input_security_api_response / output_security_api_response

```json
{
  "status": "success",
  "status_code": 200,
  "data": {
    "type": "risk-detector",
    "data": {
      "label": "UNSAFE",
      "score": 0.95
    }
  },
  "timestamp": "2025-01-XX...",
  "timing": {
    "call_start": 1234567890.124,
    "call_end": 1234567890.625,
    "duration": 0.501
  }
}
```

**label 값**:
- `UNSAFE`: 위험 탐지됨 (요청/응답 차단)
- `SAFE`: 안전함 (정상 처리)

**score**: 위험도 확률 (0.0 ~ 1.0)

### aprism_details 필드

aprism을 사용하는 경우, `security_proxied_data`에 `aprism_details` 필드가 추가됩니다. 이 필드는 aprism 응답의 세부 정보를 AIM Guard와 동일한 구조로 제공합니다.

#### 구조

**Identifier API 예시:**
```json
{
  "aprism_details": {
    "input": {
      "detected_items": {
        "item_0": {
          "detected_text": "010-1234-5678",
          "entity_type": "PHONE_NUMBER",
          "start": 0,
          "end": 13,
          "score": 0.99
        }
      },
      "policy_violations": [],
      "pii_detection": {
        "entities": [...],
        "count": 1
      },
      "detected_items_count": 1,
      "policy_violations_count": 0,
      "processing_time": null,
      "policy_enabled": null,
      "input_sources": null
    },
    "output": {
      "detected_items": {...},
      "policy_violations": [],
      "pii_detection": {...},
      "detected_items_count": 0,
      "policy_violations_count": 0,
      "processing_time": null,
      "policy_enabled": null,
      "input_sources": null
    }
  }
}
```

**Risk Detector API 예시:**
```json
{
  "aprism_details": {
    "input": {
      "detected_items": {},
      "policy_violations": [
        {
          "label": "UNSAFE",
          "score": 0.95,
          "type": "risk_detection"
        }
      ],
      "pii_detection": {},
      "detected_items_count": 0,
      "policy_violations_count": 1,
      "processing_time": null,
      "policy_enabled": null,
      "input_sources": null
    },
    "output": {
      "detected_items": {},
      "policy_violations": [],
      "pii_detection": {},
      "detected_items_count": 0,
      "policy_violations_count": 0,
      "processing_time": null,
      "policy_enabled": null,
      "input_sources": null
    }
  }
}
```

#### 필드 설명

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `input` | object | Input 검증 세부 정보 (input 검증이 수행된 경우에만 포함) |
| `output` | object | Output 검증 세부 정보 (output 검증이 수행된 경우에만 포함) |

#### input / output 객체 필드

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `detected_items` | object | 상세 탐지 정보 객체 (Identifier: entities 기반, Risk Detector: 빈 객체) |
| `policy_violations` | array | 정책 위반 목록 (Identifier: 빈 배열, Risk Detector: label="UNSAFE"일 때 포함) |
| `pii_detection` | object | PII 탐지 결과 객체 (Identifier: entities 기반, Risk Detector: 빈 객체) |
| `detected_items_count` | integer | 탐지된 항목 수 (Identifier: entities 개수, Risk Detector: 0) |
| `policy_violations_count` | integer | 정책 위반 항목 수 (Identifier: 0, Risk Detector: UNSAFE면 1, 아니면 0) |
| `processing_time` | float | 처리 시간 (aprism API 응답에 없음 → null) |
| `policy_enabled` | array | 활성화된 정책 목록 (aprism API 응답에 없음 → null) |
| `input_sources` | array | 입력된 데이터 유형 정보 (aprism API 응답에 없음 → null) |

#### 사용 예시

`aprism_details` 필드는 모니터링, 로깅, 알림 등에 활용할 수 있습니다:

- **탐지 항목 수 확인**: `detected_items_count`로 PII 탐지 개수 확인 (Identifier)
- **위험 탐지 확인**: `policy_violations_count`로 위험 탐지 여부 확인 (Risk Detector)
- **PII 탐지 분석**: `pii_detection` 객체에서 탐지된 PII 유형 및 위치 확인 (Identifier)
- **위험도 분석**: `policy_violations` 배열에서 위험도 점수 확인 (Risk Detector)

**참고**: 
- `aprism_details` 필드는 aprism을 사용하는 경우에만 포함됩니다.
- AIM Guard를 사용하는 경우 이 필드는 포함되지 않습니다.
- Input 또는 Output 중 하나만 검증한 경우, 해당하는 필드만 포함됩니다.
- `processing_time`, `policy_enabled`, `input_sources`는 aprism API 응답에 없으므로 null로 설정됩니다.
- Identifier와 Risk Detector에 따라 다른 필드 매핑이 적용됩니다.

## 사용 예시

### 예시 1: AIM Guard 기본 사용 (both - 기본값)

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: AIM" \
  -H "x-aim-guard-key: your-aim-guard-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "안녕하세요"
      }
    ]
  }'
```

**설명**:
- `x-aim-guard-type` 헤더 없음 → 기본값 "both" 적용
- Input과 output 모두 검증 수행

### 예시 2: AIM Guard input만 사용

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: AIM" \
  -H "x-aim-guard-key: your-aim-guard-api-key" \
  -H "x-aim-guard-type: input" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "내 전화번호는 010-1234-5678입니다"
      }
    ]
  }'
```

**설명**:
- Input만 검증
- Output 검증 생략

### 예시 3: AIM Guard output만 사용

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: AIM" \
  -H "x-aim-guard-key: your-aim-guard-api-key" \
  -H "x-aim-guard-type: output" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "안녕하세요"
      }
    ]
  }'
```

**설명**:
- Input 검증 생략
- Output만 검증

### 예시 4: AIM Guard 프로젝트 ID 지정

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: AIM" \
  -H "x-aim-guard-key: your-aim-guard-api-key" \
  -H "x-aim-guard-project-id: my-custom-project" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "안녕하세요"
      }
    ]
  }'
```

**설명**:
- 프로젝트별 정책 규칙 사용

### 예시 5: aprism 기본 사용

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: APRISM" \
  -H "x-aprism-inference-key: your-aprism-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "내 전화번호는 010-1234-5678이고 이메일은 test@example.com입니다"
      }
    ]
  }'
```

**설명**:
- aprism Identifier API 호출
- PII 탐지 및 마스킹
- 마스킹된 텍스트로 LLM 요청 전달

### 예시 6: aprism 제외 라벨 지정

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: APRISM" \
  -H "x-aprism-inference-key: your-aprism-api-key" \
  -H "x-aprism-exclude-labels: EMAIL,PHONE_NUMBER" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "내 전화번호는 010-1234-5678이고 이메일은 test@example.com입니다"
      }
    ]
  }'
```

**설명**:
- `x-aprism-type` 헤더 없음 → 기본값 "both" 적용
- EMAIL과 PHONE_NUMBER는 마스킹하지 않음
- 다른 PII만 탐지 및 마스킹

### 예시 7: aprism input만 사용

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: APRISM" \
  -H "x-aprism-inference-key: your-aprism-api-key" \
  -H "x-aprism-type: input" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "내 전화번호는 010-1234-5678입니다"
      }
    ]
  }'
```

**설명**:
- Input만 PII 식별 및 마스킹 수행
- Output 검증 생략

### 예시 8: aprism output만 사용

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: APRISM" \
  -H "x-aprism-inference-key: your-aprism-api-key" \
  -H "x-aprism-type: output" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "안녕하세요"
      }
    ]
  }'
```

**설명**:
- Input 검증 생략
- Output만 PII 식별 및 마스킹 수행

### 예시 9: aprism Risk Detector 기본 사용

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: APRISM" \
  -H "x-aprism-inference-key: your-aprism-api-key" \
  -H "x-aprism-api-type: risk-detector" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "안녕하세요"
      }
    ]
  }'
```

**설명**:
- Risk Detector API 사용
- 위험 탐지 수행 (UNSAFE 시 차단)
- `x-aprism-type` 헤더 없음 → 기본값 "both" 적용

### 예시 10: aprism Risk Detector input만 사용

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: APRISM" \
  -H "x-aprism-inference-key: your-aprism-api-key" \
  -H "x-aprism-api-type: risk-detector" \
  -H "x-aprism-type: input" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "안녕하세요"
      }
    ]
  }'
```

**설명**:
- Risk Detector API 사용
- Input만 위험 탐지 수행
- Output 검증 생략

### 예시 11: 하위 호환성 (x-external-api 없음)

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-aim-guard-key: your-aim-guard-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "안녕하세요"
      }
    ]
  }'
```

**설명**:
- `x-external-api` 헤더 없어도 `x-aim-guard-key`만 있으면 AIM Guard로 자동 감지

### 예시 12: 파일 첨부 (aprism - Base64 Data URL)

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: APRISM" \
  -H "x-aprism-inference-key: your-aprism-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "이 파일을 분석해주세요"
          },
          {
            "type": "file",
            "data_url": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK..."
          }
        ]
      }
    ]
  }'
```

**설명**:
- aprism은 Base64 Data URL 형식의 파일을 지원합니다
- 파일이 자동으로 업로드 및 파싱되어 S3 파일 기반 요청으로 변환됩니다
- `x-aprism-type` 헤더 없음 → 기본값 "both" 적용

### 예시 13: 파일 첨부 (AIM Guard - 텍스트만)

```bash
curl -X POST https://your-proxy-host/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-external-api: AIM" \
  -H "x-aim-guard-key: your-aim-guard-api-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "이 이미지를 설명해주세요"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/jpeg;base64,..."
            }
          }
        ]
      }
    ]
  }'
```

**설명**:
- AIM Guard는 텍스트만 지원합니다
- content 배열에서 "text" 타입만 추출하여 AIM Guard에 전달
- "image_url" 또는 "file" 타입은 건너뛰고 경고 로그 출력

## 에러 처리

### 보안 API 호출 실패

보안 API 호출이 실패하거나 타임아웃된 경우, 원본 LLM 요청은 그대로 진행됩니다 (Graceful Degradation).

#### 에러 응답 구조

```json
{
  "status": "error",
  "status_code": 500,
  "error": "Internal Server Error",
  "timestamp": "2025-01-XX...",
  "traceback": "Traceback (most recent call last):\n..."
}
```

**필드 설명**:
- `status`: "error" 또는 "timeout"
- `status_code`: HTTP 상태 코드 (HTTP 에러인 경우에만 포함)
- `error`: 에러 메시지
- `timestamp`: 에러 발생 시간 (ISO 8601 형식)
- `traceback`: 예외 발생 시 트레이스백 정보 (선택적, 예외 발생 시에만 포함)

#### 타임아웃 응답 구조

```json
{
  "status": "timeout",
  "error": "External API request timeout",
  "timestamp": "2025-01-XX..."
}
```

#### 생략 응답 구조

일부 조건으로 인해 보안 API 호출이 생략된 경우:

```json
{
  "status": "skipped",
  "reason": "No user message content found"
}
```

**응답 처리**:
- `input_security_api_response.status`가 "error", "timeout", 또는 "skipped"이면 원본 요청 진행
- `output_security_api_response.status`가 "error", "timeout", 또는 "skipped"이면 원본 응답 반환

### BLOCKING 응답

#### Input BLOCKING

AIM Guard가 `action: "BLOCKING"`을 반환하면, LLM 호출이 차단되고 다음 메시지가 반환됩니다:

```json
{
  "error": {
    "message": "요청하신 내용이 보안 정책을 위반하여 처리할 수 없습니다.",
    "type": "invalid_request_error",
    "code": "content_filter"
  }
}
```

#### Output BLOCKING

AIM Guard가 output 검증에서 `action: "BLOCKING"`을 반환하면, LLM 응답의 content가 차단 메시지로 대체됩니다:

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "응답 내용이 보안 정책을 위반하여 표시할 수 없습니다."
      }
    }
  ]
}
```

### MASKING 응답

#### Input MASKING

AIM Guard가 `action: "MASKING"`을 반환하면, 마스킹된 텍스트로 LLM 요청이 전달됩니다:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "내 전화번호는 PHONE_NUMBER입니다"
    }
  ]
}
```

#### Output MASKING

AIM Guard가 output 검증에서 `action: "MASKING"`을 반환하면, LLM 응답의 content가 마스킹된 텍스트로 대체됩니다.

### aprism 응답

#### Identifier API

**Input 처리**:
aprism Identifier가 input에서 PII를 탐지하면:
1. 마스킹된 텍스트(`abstracted`)로 사용자 메시지 대체
2. 탐지된 엔티티 정보가 시스템 메시지로 추가되어 LLM에 전달

**Output 처리**:
aprism Identifier가 output에서 PII를 탐지하면:
1. 마스킹된 텍스트(`abstracted`)로 LLM 응답의 content 대체
2. 원본 응답은 `security_proxied_data.llm_response`에 보존됨

#### Risk Detector API

**Input 처리**:
aprism Risk Detector가 input에서 위험을 탐지하면:
1. `label == "UNSAFE"`: 요청 차단 (차단 메시지 반환)
2. `label == "SAFE"`: 정상 처리 (LLM 호출 진행)

**Output 처리**:
aprism Risk Detector가 output에서 위험을 탐지하면:
1. `label == "UNSAFE"`: 응답 차단 (응답 content를 차단 메시지로 대체)
2. `label == "SAFE"`: 정상 처리 (원본 응답 유지)

## 주의사항

### 파일 지원

- **AIM Guard**: 텍스트만 지원합니다. content 배열이 포함된 경우, "text" 타입만 추출되어 전달되며, "image_url" 또는 "file" 타입은 건너뛰고 경고 로그가 출력됩니다.
- **aprism**: Base64 Data URL 형식의 파일을 지원합니다. `{"type": "file", "data_url": "data:..."}` 형식으로 파일을 첨부하면 자동으로 업로드 및 파싱 후 S3 파일 기반 요청으로 변환됩니다.

### 성능 고려사항

- 보안 API 호출로 인한 지연 발생 가능
- Input과 output 모두 검증 시 총 2회의 보안 API 호출 발생
- 시간 측정 정보는 `security_proxied_data.timing`에서 확인 가능

### API 키 보안

- API 키는 헤더에 포함되므로 HTTPS 사용 권장
- 민감한 정보이므로 로깅이나 캐싱 시 주의 필요

### 하위 호환성

- `x-external-api` 헤더 없이도 기존 API 키 헤더만으로 동작
- `x-aim-guard-type` 헤더 없으면 기본값 "both" 적용
- `x-aprism-type` 헤더 없으면 기본값 "both" 적용
- `x-aprism-api-type` 헤더 없으면 기본값 "identifier" 적용 (하위 호환성)
- 두 API 키가 모두 제공되면 우선순위에 따라 하나만 선택:
  - `x-external-api` 헤더가 있으면 해당 값 사용 (최우선)
  - 없으면 `x-aim-guard-key`가 있으면 AIM Guard, 그렇지 않으면 aprism 사용

## FAQ

### Q: 보안 API 호출이 실패하면 어떻게 되나요?

A: 원본 LLM 요청은 그대로 진행됩니다 (Graceful Degradation). 실패 정보는 `security_proxied_data`에 포함됩니다.

### Q: input과 output을 각각 다른 보안 API로 사용할 수 있나요?

A: 현재는 동일한 보안 API만 사용 가능합니다. 선택한 API (AIM Guard 또는 aprism)가 input과 output을 모두 처리합니다. Input은 `x-{api}-type: input` 또는 `both`, output은 `x-{api}-type: output` 또는 `both`로 제어할 수 있습니다.

### Q: 파일 업로드는 어떻게 처리되나요?

A: 
- **aprism**: Base64 Data URL 형식의 파일을 지원합니다. `{"type": "file", "data_url": "data:..."}` 형식으로 파일을 첨부하면 자동으로 aprism에 업로드 및 파싱되어 S3 파일 기반 요청으로 변환됩니다.
- **AIM Guard**: 텍스트만 지원합니다. content 배열이 포함된 경우, "text" 타입만 추출되어 전달되며, "image_url" 또는 "file" 타입은 건너뛰고 텍스트만 처리됩니다.

### Q: 시간 측정 정보는 어디서 확인할 수 있나요?

A: `response.security_proxied_data.timing` 필드에서 확인 가능합니다.

### Q: 여러 보안 API를 동시에 사용할 수 있나요?

A: 현재는 한 번에 하나의 보안 API만 사용 가능합니다. `x-external-api` 헤더로 명시적으로 선택하거나, 헤더가 없으면 API 키 헤더로 자동 감지됩니다. 두 API 키가 모두 제공되면 AIM Guard가 우선 선택됩니다 (단, `x-external-api` 헤더가 최우선).

## 구현 참고

### 응답 구조 생성 위치

`security_proxied_data` 필드는 `security_proxy_handler.py`의 다음 메서드에서 생성됩니다:

- **`_build_structured_response`** (2507-2581줄): 구조화된 응답 딕셔너리 생성
- **`async_post_call_success_hook`** (2583-2676줄): LLM 응답 객체에 `security_proxied_data` 속성 추가

### 주요 구현 세부사항

- 응답 구조는 `_build_structured_response` 메서드에서 생성되며, 보안 API 타입(AIM Guard 또는 aprism)에 따라 `aim_guard_details` 또는 `aprism_details` 필드가 조건부로 추가됩니다.
- 세부 정보 추출은 `SecurityResponseAdapter` 추상 클래스와 구현체(`AIMGuardAdapter`, `AprismIdentifierAdapter`, `AprismRiskDetectorAdapter`)를 통해 수행됩니다.
- 시간 측정 정보는 `metadata._timing`에 저장되며, 최종 응답 구조의 `timing` 필드로 변환됩니다.

## 지원 및 문의

문제가 발생하거나 질문이 있으시면 프로젝트 저장소의 Issues를 확인하거나 관리자에게 문의하세요.

