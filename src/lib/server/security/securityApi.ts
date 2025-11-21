import type { EndpointMessage } from "../endpoints/endpoints";
import type OpenAI from "openai";
/* eslint-disable no-undef */
/* global HeadersInit, AbortSignal, setTimeout, fetch */
import { logger } from "$lib/server/logger";

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
	timing?: {
		call_start?: number;
		call_end?: number;
		duration?: number;
	};
}

/**
 * Security API 에러 정보
 */
export interface SecurityApiError {
	error: string;
	status?: "error" | "timeout";
	status_code?: number;
	timestamp?: string;
	traceback?: string;
}

/**
 * Handler 내부 에러 정보
 */
export interface HandlerError {
	error: string;
	traceback?: string;
	timestamp?: string;
	stage?: string;
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
	input_security_api_error?: SecurityApiError; // input 보안 API 호출 실패 시 에러 정보
	llm_request?: unknown; // 보안 검증 후 LLM에 전달된 수정된 요청
	llm_response?: unknown;
	output_security_api_response?: SecurityApiCallResponse;
	output_security_api_error?: SecurityApiError; // output 보안 API 호출 실패 시 에러 정보
	timing?: TimingInfo;
	metadata?: unknown;
	handler_error?: HandlerError; // handler 내부 오류 시 에러 정보
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
 * x-external-api 헤더 값에 따라 결정 (문서: REQUEST_RESPONSE_SCHEMA.md)
 */
export function determineSecurityApi(config: SecurityApiConfig): "AIM" | "APRISM" | null {
	// x-external-api 헤더 값이 명시되면 해당 API 사용
	if (config.externalApi && config.externalApi !== "NONE") {
		return config.externalApi;
	}

	// x-external-api가 없거나 "NONE"이면 보안 API 사용 안 함
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

	// x-external-api 헤더는 externalApi가 "NONE"이 아닌 경우 항상 추가
	if (config.externalApi && config.externalApi !== "NONE") {
		headers["x-external-api"] = config.externalApi;
	}

	// AIM Guard 헤더
	// 참고: API 키(x-aim-guard-key)는 백엔드에서 처리하므로 현재 프로젝트에서는 추가하지 않음
	if (apiType === "AIM") {
		if (config.aimGuardType) {
			headers["x-aim-guard-type"] = config.aimGuardType;
		}
		if (config.aimGuardProjectId) {
			headers["x-aim-guard-project-id"] = config.aimGuardProjectId;
		}
	}

	// aprism 헤더
	// 참고: API 키(x-aprism-inference-key)는 백엔드에서 처리하므로 현재 프로젝트에서는 추가하지 않음
	if (apiType === "APRISM") {
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

	// 디버깅: 생성된 헤더 로그
	logger.debug(
		{
			externalApi: config.externalApi,
			apiType,
			headers: Object.keys(headers),
			headerValues: Object.fromEntries(
				Object.entries(headers).map(([key, value]) => [
					key,
					key.toLowerCase().includes("key") ? "[REDACTED]" : value,
				])
			),
		},
		"Security API headers built"
	);

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
					.map((item: { type?: string; text?: string }) =>
						typeof item.text === "string" ? item.text : ""
					)
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

		// 디버깅: 요청 전 로그
		logger.debug(
			{
				url: securityApiUrl,
				method: "POST",
				headers: Object.keys(headers),
				headerValues: Object.fromEntries(
					Object.entries(headers).map(([key, value]) => [
						key,
						key.toLowerCase().includes("key") ? "[REDACTED]" : value,
					])
				),
				messageCount: messagesOpenAI.length,
				apiType,
			},
			"Sending Security API request"
		);

		const response = await fetch(securityApiUrl, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
			signal: abortSignal,
		});

		// 디버깅: 응답 로그
		logger.debug(
			{
				status: response.status,
				statusText: response.statusText,
				responseHeaders: Object.fromEntries(response.headers.entries()),
			},
			"Security API response received"
		);

		const securityResponseTime = Date.now() - startTime;

		if (!response.ok) {
			const errorText = await response.text();
			logger.warn(
				{
					status: response.status,
					statusText: response.statusText,
					url: securityApiUrl,
					apiType,
					errorText: errorText.substring(0, 500), // 최대 500자만 로그
				},
				"Security API request failed"
			);
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

		// 디버깅: 성공 응답 로그
		logger.debug(
			{
				hasSecurityProxiedData: !!securityProxiedData,
				responseId: data.id,
				model: data.model,
				choicesCount: data.choices?.length || 0,
				securityResponseTime,
			},
			"Security API request succeeded"
		);

		return {
			response: data,
			securityProxiedData,
			securityResponseTime,
		};
	} catch (error) {
		const securityResponseTime = Date.now() - startTime;
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(
			{
				error: errorMessage,
				url: config.url,
				apiType,
				stack: error instanceof Error ? error.stack : undefined,
			},
			"Security API request exception"
		);
		return {
			response: null,
			securityProxiedData: undefined,
			securityResponseTime,
			error: errorMessage,
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
	const url = conversationMeta?.securityApiUrl ?? globalSettings?.securityApiUrl ?? "";

	const externalApi =
		conversationMeta?.securityExternalApi ?? globalSettings?.securityExternalApi ?? "NONE";

	// Return null if explicitly set to "NONE" (라디오 버튼으로 제어)
	if (externalApi === "NONE") {
		logger.debug(
			{
				conversationMeta: conversationMeta?.securityExternalApi,
				globalSettings: globalSettings?.securityExternalApi,
				externalApi,
			},
			"Security API disabled (externalApi is NONE)"
		);
		return null;
	}

	// 기본값 적용
	const aimGuardType =
		conversationMeta?.securityAimGuardType ?? globalSettings?.securityAimGuardType ?? "both";
	const aprismApiType =
		conversationMeta?.securityAprismApiType ??
		globalSettings?.securityAprismApiType ??
		"identifier";
	const aprismType =
		conversationMeta?.securityAprismType ?? globalSettings?.securityAprismType ?? "both";
	const aimGuardProjectId =
		conversationMeta?.securityAimGuardProjectId ??
		globalSettings?.securityAimGuardProjectId ??
		"default";

	// aprismExcludeLabels 파싱
	const excludeLabelsStr =
		conversationMeta?.securityAprismExcludeLabels ??
		globalSettings?.securityAprismExcludeLabels ??
		"";
	const aprismExcludeLabels = excludeLabelsStr
		? excludeLabelsStr
				.split(",")
				.map((label) => label.trim())
				.filter((label) => label.length > 0)
		: undefined;

	const mergedConfig = {
		enabled: true, // externalApi가 "NONE"이 아니면 항상 활성화
		url,
		externalApi:
			conversationMeta?.securityExternalApi ?? globalSettings?.securityExternalApi ?? "NONE",
		aimGuardType,
		aimGuardProjectId,
		aprismApiType,
		aprismType,
		aprismExcludeLabels,
	};

	// 디버깅: 병합된 설정 로그
	logger.debug(
		{
			externalApi: mergedConfig.externalApi,
			url: mergedConfig.url || "[empty]",
			aimGuardType: mergedConfig.aimGuardType,
			aimGuardProjectId: mergedConfig.aimGuardProjectId,
			aprismApiType: mergedConfig.aprismApiType,
			aprismType: mergedConfig.aprismType,
			aprismExcludeLabels: mergedConfig.aprismExcludeLabels,
			source: {
				conversationMeta: {
					securityExternalApi: conversationMeta?.securityExternalApi,
					securityApiUrl: conversationMeta?.securityApiUrl ? "[set]" : "[empty]",
				},
				globalSettings: {
					securityExternalApi: globalSettings?.securityExternalApi,
					securityApiUrl: globalSettings?.securityApiUrl ? "[set]" : "[empty]",
				},
			},
		},
		"Security API config merged"
	);

	return mergedConfig;
}
