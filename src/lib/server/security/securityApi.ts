import type { EndpointMessage } from "../endpoints/endpoints";
import type OpenAI from "openai";
import { env as serverEnv } from "$env/dynamic/private";

/**
 * Security Proxy Handler 설정
 * CLIENT_GUIDE.md 명세에 따라 모든 옵션을 선택적으로 적용 가능
 */
export interface SecurityApiConfig {
	enabled: boolean;
	url: string;
	// API 선택: "AIM" | "APRISM" | "NONE" ("NONE"이면 사용 안함)
	externalApi?: "AIM" | "APRISM" | "NONE";
	// AIM Guard 설정
	aimGuardType?: "both" | "input" | "output"; // 기본값: "both"
	aimGuardProjectId?: string; // 기본값: "default"
	// aprism 설정
	aprismApiType?: "identifier" | "risk-detector"; // 기본값: "identifier"
	aprismType?: "both" | "input" | "output"; // 기본값: "both"
	aprismExcludeLabels?: string[]; // 빈 배열이면 모든 라벨 처리
}

/**
 * 보안 API 호출 응답 구조
 */
export interface SecurityApiCallResponse {
	status: "success" | "error" | "timeout" | "skipped";
	status_code?: number;
	data?: {
		action?: "NONE" | "MASKING" | "BLOCKING";
		masked_text?: string;
		type?: "identifier" | "risk-detector";
		// AIM Guard 필드
		detected_items_count?: number;
		policy_violations_count?: number;
		processing_time?: number;
		policy_enabled?: string[];
		input_sources?: string[];
		policy_violations?: unknown[];
		pii_detection?: unknown;
		detected_items?: unknown;
		// aprism Identifier 필드
		entities?: Array<{
			label: string;
			text: string;
			start: number;
			end: number;
			score: number;
		}>;
		abstracted?: string;
		original?: string;
		// aprism Risk Detector 필드
		label?: "SAFE" | "UNSAFE";
		score?: number;
	};
	error?: string;
	timestamp?: string;
	traceback?: string;
	reason?: string;
}

/**
 * Timing 정보
 */
export interface TimingInfo {
	pre_call_start?: number;
	input_security_api_call_start?: number;
	input_security_api_call_end?: number;
	input_security_api_duration?: number;
	llm_call_start?: number;
	llm_call_end?: number;
	llm_call_duration?: number;
	output_security_api_call_start?: number;
	output_security_api_call_end?: number;
	output_security_api_duration?: number;
	total_duration?: number;
}

/**
 * AIM Guard 세부 정보
 */
export interface AimGuardDetails {
	input?: {
		detected_items?: unknown;
		policy_violations?: unknown[];
		pii_detection?: unknown;
		detected_items_count?: number;
		policy_violations_count?: number;
		processing_time?: number;
		policy_enabled?: string[];
		input_sources?: string[];
	};
	output?: {
		detected_items?: unknown;
		policy_violations?: unknown[];
		pii_detection?: unknown;
		detected_items_count?: number;
		policy_violations_count?: number;
		processing_time?: number;
		policy_enabled?: string[];
		input_sources?: string[];
	};
}

/**
 * aprism 세부 정보
 */
export interface AprismDetails {
	input?: {
		detected_items?: unknown;
		policy_violations?: unknown[];
		pii_detection?: unknown;
		detected_items_count?: number;
		policy_violations_count?: number;
		processing_time?: null;
		policy_enabled?: null;
		input_sources?: null;
	};
	output?: {
		detected_items?: unknown;
		policy_violations?: unknown[];
		pii_detection?: unknown;
		detected_items_count?: number;
		policy_violations_count?: number;
		processing_time?: null;
		policy_enabled?: null;
		input_sources?: null;
	};
}

/**
 * security_proxied_data 구조
 */
export interface SecurityProxiedData {
	original_request?: unknown;
	input_security_api_response?: SecurityApiCallResponse;
	output_security_api_response?: SecurityApiCallResponse;
	llm_response?: unknown;
	timing?: TimingInfo;
	metadata?: unknown;
	aim_guard_details?: AimGuardDetails;
	aprism_details?: AprismDetails;
	// 하위 호환성
	external_api_response?: SecurityApiCallResponse;
}

/**
 * Security API 응답
 */
export interface SecurityApiResponse {
	response: OpenAI.Chat.Completions.ChatCompletion | null;
	securityProxiedData?: SecurityProxiedData;
	securityResponseTime: number;
	error?: string;
	isDummy?: boolean;
}

/**
 * API 타입 결정
 * 헤더 우선순위: externalApi > API 키 헤더 자동 감지 (AIM Guard 우선)
 */
export function determineSecurityApi(config: SecurityApiConfig): "AIM" | "APRISM" | null {
	if (config.externalApi && config.externalApi !== "NONE") {
		return config.externalApi;
	}

	// API 키 헤더로 자동 감지
	const aimGuardKey = serverEnv.AIM_GUARD_KEY;
	const aprismInferenceKey = serverEnv.APRISM_INFERENCE_KEY;

	if (aimGuardKey) {
		return "AIM";
	}
	if (aprismInferenceKey) {
		return "APRISM";
	}

	return null;
}

/**
 * 보안 API 요청 헤더 구성
 */
export function buildSecurityApiHeaders(config: SecurityApiConfig): HeadersInit {
	const headers: HeadersInit = {
		"content-type": "application/json",
	};

	const apiType = determineSecurityApi(config);

	// x-external-api 헤더 (명시된 경우만)
	if (config.externalApi) {
		headers["x-external-api"] = config.externalApi;
	}

	// AIM Guard 헤더
	if (apiType === "AIM") {
		const aimGuardKey = serverEnv.AIM_GUARD_KEY;
		if (aimGuardKey) {
			headers["x-aim-guard-key"] = aimGuardKey;
		}
		if (config.aimGuardType) {
			headers["x-aim-guard-type"] = config.aimGuardType;
		}
		if (config.aimGuardProjectId) {
			headers["x-aim-guard-project-id"] = config.aimGuardProjectId;
		}
	}

	// aprism 헤더
	if (apiType === "APRISM") {
		const aprismInferenceKey = serverEnv.APRISM_INFERENCE_KEY;
		if (aprismInferenceKey) {
			headers["x-aprism-inference-key"] = aprismInferenceKey;
		}
		if (config.aprismApiType) {
			headers["x-aprism-api-type"] = config.aprismApiType;
		}
		if (config.aprismType) {
			headers["x-aprism-type"] = config.aprismType;
		}
		if (config.aprismExcludeLabels && config.aprismExcludeLabels.length > 0) {
			headers["x-aprism-exclude-labels"] = config.aprismExcludeLabels.join(",");
		}
	}

	return headers;
}

/**
 * 메시지를 보안 API 형식으로 변환
 * AIM Guard: 텍스트만 추출
 * aprism: Base64 Data URL 형식 파일 지원
 */
export function convertMessagesForSecurityApi(
	messages: EndpointMessage[],
	apiType: "AIM" | "APRISM" | null
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
	return messages.map((msg) => {
		const role: "user" | "assistant" | "system" =
			msg.from === "user" ? "user" : msg.from === "assistant" ? "assistant" : "system";

		// 문자열 형식이면 그대로 사용
		if (typeof msg.content === "string") {
			return { role, content: msg.content };
		}

		// 배열 형식 (파일 첨부)
		if (Array.isArray(msg.content)) {
			if (apiType === "AIM") {
				// AIM Guard는 텍스트만 추출
				const textParts = (msg.content as Array<{ type?: string; text?: string }>)
					.filter((item: { type?: string; text?: string }) => item.type === "text")
					.map((item: { type?: string; text?: string }) => (typeof item.text === "string" ? item.text : ""))
					.join(" ");
				return { role, content: textParts || "" };
			}

			// aprism은 Base64 Data URL 형식 지원
			return { role, content: msg.content };
		}

		// 기본값
		return { role, content: String(msg.content || "") };
	});
}

/**
 * security_proxied_data 파싱
 */
export function parseSecurityProxiedData(response: unknown): SecurityProxiedData | undefined {
	if (!response || typeof response !== "object") {
		return undefined;
	}

	const obj = response as Record<string, unknown>;
	if ("security_proxied_data" in obj) {
		return obj.security_proxied_data as SecurityProxiedData;
	}

	return undefined;
}

/**
 * 보안 API 액션 처리
 */
export function handleSecurityApiAction(
	action: string | undefined,
	maskedText?: string
): { shouldBlock: boolean; content?: string } {
	if (action === "BLOCKING") {
		return { shouldBlock: true };
	}
	if (action === "MASKING" && maskedText) {
		return { shouldBlock: false, content: maskedText };
	}
	// NONE 또는 기타
	return { shouldBlock: false };
}

/**
 * Call security API with OpenAI Chat Completions format
 * Returns the security API response and timing information
 */
export async function callSecurityApi(
	messages: EndpointMessage[],
	config: SecurityApiConfig,
	abortSignal?: AbortSignal
): Promise<SecurityApiResponse> {
	if (!config.enabled) {
		return { response: null, securityProxiedData: undefined, securityResponseTime: 0 };
	}

	// URL이 없으면 더미 응답 반환
	if (!config.url) {
		const startTime = Date.now();
		await new Promise((resolve) => setTimeout(resolve, 100));
		const securityResponseTime = Date.now() - startTime;

		const messagesOpenAI = convertMessagesForSecurityApi(messages, null);
		const lastUserMessage = messagesOpenAI[messagesOpenAI.length - 1];
		const originalContent =
			lastUserMessage?.role === "user" && typeof lastUserMessage.content === "string"
				? lastUserMessage.content
				: "";

		const dummyResponse: OpenAI.Chat.Completions.ChatCompletion = {
			id: "dummy-security-response",
			object: "chat.completion",
			created: Math.floor(Date.now() / 1000),
			model: "gpt-3.5-turbo",
			choices: [
				{
					index: 0,
					message: {
						role: "assistant",
						content: originalContent
							? `[Security API 더미 응답] Security API URL이 설정되지 않았습니다. 원본 메시지: "${originalContent}"`
							: "[Security API 더미 응답] Security API URL이 설정되지 않았습니다.",
						refusal: null,
					},
					finish_reason: "stop",
					logprobs: null,
				},
			],
			usage: {
				prompt_tokens: 0,
				completion_tokens: 0,
				total_tokens: 0,
			},
		};

		return {
			response: dummyResponse,
			securityProxiedData: undefined,
			securityResponseTime,
			isDummy: true,
		};
	}

	const startTime = Date.now();
	const apiType = determineSecurityApi(config);

	try {
		// 메시지 변환
		const messagesOpenAI = convertMessagesForSecurityApi(messages, apiType);

		// Security API URL 구성
		const securityApiUrl = config.url.endsWith("/")
			? `${config.url}v1/chat/completions`
			: `${config.url}/v1/chat/completions`;

		// 헤더 구성
		const headers = buildSecurityApiHeaders(config);

		// 요청 본문
		const body = {
			model: "gpt-3.5-turbo", // Dummy model for security API
			messages: messagesOpenAI,
			stream: false,
		};

		const response = await fetch(securityApiUrl, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
			signal: abortSignal,
		});

		const securityResponseTime = Date.now() - startTime;

		if (!response.ok) {
			const errorText = await response.text();
			return {
				response: null,
				securityProxiedData: undefined,
				securityResponseTime,
				error: `Security API error: ${response.status} ${errorText}`,
			};
		}

		const data = (await response.json()) as OpenAI.Chat.Completions.ChatCompletion & {
			security_proxied_data?: SecurityProxiedData;
		};

		// security_proxied_data 추출
		const securityProxiedData = parseSecurityProxiedData(data) || data.security_proxied_data;

		return {
			response: data,
			securityProxiedData,
			securityResponseTime,
		};
	} catch (error) {
		const securityResponseTime = Date.now() - startTime;
		return {
			response: null,
			securityProxiedData: undefined,
			securityResponseTime,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Merge security API settings from conversation meta and global settings
 * Priority: conversation meta > global settings
 */
export function mergeSecurityApiConfig(
	conversationMeta?: {
		securityApiEnabled?: boolean;
		securityApiUrl?: string;
		securityExternalApi?: "AIM" | "APRISM" | "NONE";
		securityAimGuardType?: "both" | "input" | "output";
		securityAimGuardProjectId?: string;
		securityAprismApiType?: "identifier" | "risk-detector";
		securityAprismType?: "both" | "input" | "output";
		securityAprismExcludeLabels?: string; // 콤마로 구분된 문자열
	},
	globalSettings?: {
		securityApiEnabled?: boolean;
		securityApiUrl?: string;
		securityExternalApi?: "AIM" | "APRISM" | "NONE";
		securityAimGuardType?: "both" | "input" | "output";
		securityAimGuardProjectId?: string;
		securityAprismApiType?: "identifier" | "risk-detector";
		securityAprismType?: "both" | "input" | "output";
		securityAprismExcludeLabels?: string; // 콤마로 구분된 문자열
	}
): SecurityApiConfig | null {
	const enabled =
		conversationMeta?.securityApiEnabled ?? globalSettings?.securityApiEnabled ?? false;
	const url = conversationMeta?.securityApiUrl ?? globalSettings?.securityApiUrl ?? "";

	// Return null if disabled or explicitly set to "NONE"
	if (!enabled) {
		return null;
	}

	const externalApi = conversationMeta?.securityExternalApi ?? globalSettings?.securityExternalApi ?? "NONE";
	if (externalApi === "NONE") {
		return null;
	}

	// 기본값 적용
	const aimGuardType = conversationMeta?.securityAimGuardType ?? globalSettings?.securityAimGuardType ?? "both";
	const aprismApiType = conversationMeta?.securityAprismApiType ?? globalSettings?.securityAprismApiType ?? "identifier";
	const aprismType = conversationMeta?.securityAprismType ?? globalSettings?.securityAprismType ?? "both";
	const aimGuardProjectId = conversationMeta?.securityAimGuardProjectId ?? globalSettings?.securityAimGuardProjectId ?? "default";

	// aprismExcludeLabels 파싱
	const excludeLabelsStr = conversationMeta?.securityAprismExcludeLabels ?? globalSettings?.securityAprismExcludeLabels ?? "";
	const aprismExcludeLabels = excludeLabelsStr
		? excludeLabelsStr.split(",").map((label) => label.trim()).filter((label) => label.length > 0)
		: undefined;

	return {
		enabled,
		url,
		externalApi: conversationMeta?.securityExternalApi ?? globalSettings?.securityExternalApi ?? "NONE",
		aimGuardType,
		aimGuardProjectId,
		aprismApiType,
		aprismType,
		aprismExcludeLabels,
	};
}
