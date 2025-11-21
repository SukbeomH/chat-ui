import type { InferenceProvider } from "@huggingface/inference";
import type {
	SecurityApiCallResponse,
	SecurityApiError,
	HandlerError,
} from "$lib/server/security/securityApi";

export type MessageUpdate =
	| MessageStatusUpdate
	| MessageTitleUpdate
	| MessageStreamUpdate
	| MessageFileUpdate
	| MessageFinalAnswerUpdate
	| MessageReasoningUpdate
	| MessageRouterMetadataUpdate
	| MessageDebugUpdate;

export enum MessageUpdateType {
	Status = "status",
	Title = "title",
	Stream = "stream",
	File = "file",
	FinalAnswer = "finalAnswer",
	Reasoning = "reasoning",
	RouterMetadata = "routerMetadata",
	Debug = "debug",
}

// Status
export enum MessageUpdateStatus {
	Started = "started",
	Error = "error",
	Finished = "finished",
	KeepAlive = "keepAlive",
	SecurityApiRequesting = "securityApiRequesting",
	SecurityApiResponded = "securityApiResponded",
	LlmRequesting = "llmRequesting",
	LlmResponded = "llmResponded",
}
export interface MessageStatusUpdate {
	type: MessageUpdateType.Status;
	status: MessageUpdateStatus;
	message?: string;
	statusCode?: number;
}

// Everything else
export interface MessageTitleUpdate {
	type: MessageUpdateType.Title;
	title: string;
}
export interface MessageStreamUpdate {
	type: MessageUpdateType.Stream;
	token: string;
}

export enum MessageReasoningUpdateType {
	Stream = "stream",
	Status = "status",
}

export type MessageReasoningUpdate = MessageReasoningStreamUpdate | MessageReasoningStatusUpdate;

export interface MessageReasoningStreamUpdate {
	type: MessageUpdateType.Reasoning;
	subtype: MessageReasoningUpdateType.Stream;
	token: string;
}
export interface MessageReasoningStatusUpdate {
	type: MessageUpdateType.Reasoning;
	subtype: MessageReasoningUpdateType.Status;
	status: string;
}

export interface MessageFileUpdate {
	type: MessageUpdateType.File;
	name: string;
	sha: string;
	mime: string;
}
export interface MessageFinalAnswerUpdate {
	type: MessageUpdateType.FinalAnswer;
	text: string;
	interrupted: boolean;
}
export interface MessageRouterMetadataUpdate {
	type: MessageUpdateType.RouterMetadata;
	route: string;
	model: string;
	provider?: InferenceProvider;
}

export interface MessageDebugUpdate {
	type: MessageUpdateType.Debug;
	originalRequest?: {
		model?: string;
		messages?: unknown[];
		[key: string]: unknown;
	};
	securityResponse?: {
		action: "allow" | "block" | "modify";
		reason?: string;
		modifiedKwargs?: Record<string, unknown>;
	};
	securityResponseTime?: number;
	inputSecurityApiResponse?: SecurityApiCallResponse;
	inputSecurityApiError?: SecurityApiError; // input 보안 API 호출 실패 시 에러 정보
	outputSecurityApiResponse?: SecurityApiCallResponse;
	outputSecurityApiError?: SecurityApiError; // output 보안 API 호출 실패 시 에러 정보
	inputSecurityApiDuration?: number; // ms
	outputSecurityApiDuration?: number; // ms
	securityProxiedLlmRequest?: unknown; // security_proxied_data.llm_request (보안 검증 후 LLM에 전달된 수정된 요청)
	llmResponse?: unknown; // security_proxied_data.llm_response
	handlerError?: HandlerError; // handler 내부 오류 시 에러 정보
	finalLlmResponse?: {
		id?: string;
		choices?: unknown[];
		model?: string;
		usage?: unknown;
		[key: string]: unknown;
	};
	finalResponse?: string; // 최종 반환된 메시지 내용 (보안 심사 후 수정된 응답)
	llmResponseTime?: number;
	totalTime?: number;
	error?: string;
	isDummyResponse?: boolean;
	securityProxiedData?: unknown; // 전체 security_proxied_data 참조용
}
