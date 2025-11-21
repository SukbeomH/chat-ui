/* eslint-disable no-undef */
/* global Blob, URL, document, console */
import type { Conversation } from "$lib/types/Conversation";
import type { Message } from "$lib/types/Message";
import type { MessageDebugUpdate } from "$lib/types/MessageUpdate";
import { MessageUpdateType } from "$lib/types/MessageUpdate";
import { storage } from "$lib/storage/indexedDB";

/**
 * CSV 컬럼 헤더 정의
 */
export const CSV_COLUMNS = [
	// Conversation 정보
	"Conversation ID",
	"Conversation Title",
	"Model",
	"Conversation Created At",
	"Conversation Updated At",
	"Preprompt",
	"User Agent",
	"Security API Enabled",
	"Security External API",

	// Message 정보
	"Message ID",
	"Message From",
	"Message Content",
	"Message Score",
	"Interrupted",
	"Message Created At",
	"Message Updated At",
	"Router Route",
	"Router Model",
	"Router Provider",
	"Ancestors",
	"Children",

	// File 정보
	"File Count",
	"File Names",
	"File Types",
	"File MIMEs",

	// Debug 정보 기본
	"Has Debug Info",
	"Input Security API Status",
	"Input Security API Action",
	"Input Security API Duration (ms)",
	"Output Security API Status",
	"Output Security API Action",
	"Output Security API Duration (ms)",
	"LLM Response Time (ms)",
	"Total Time (ms)",

	// Error 정보
	"Has Input Security Error",
	"Has Output Security Error",
	"Has Handler Error",

	// JSON 데이터
	"Debug Summary JSON",
] as const;

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

/**
 * 배열을 파이프(|)로 구분된 문자열로 변환
 */
function arrayToString(arr: unknown[] | undefined): string {
	if (!arr || arr.length === 0) return "";
	return arr.map((item) => String(item)).join("|");
}

/**
 * 날짜를 ISO 8601 형식으로 변환
 */
function formatDate(date: Date | string | undefined): string {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	return isNaN(d.getTime()) ? "" : d.toISOString();
}

/**
 * JSON 객체를 안전하게 문자열로 변환 (CSV 내 포함용)
 */
function jsonToCsvString(obj: unknown): string {
	if (!obj) return "";
	try {
		return JSON.stringify(obj).replace(/"/g, '""'); // CSV 내 큰따옴표 이스케이프
	} catch {
		return "";
	}
}

/**
 * Conversation과 Message를 CSV 행 배열로 변환
 */
export function conversationToCsvRows(conversation: Conversation): string[][] {
	const rows: string[][] = [];

	// Conversation 메타데이터 추출
	const convMeta = {
		id: conversation.id,
		title: conversation.title,
		model: conversation.model,
		createdAt: formatDate(conversation.createdAt),
		updatedAt: formatDate(conversation.updatedAt),
		preprompt: conversation.preprompt || "",
		userAgent: conversation.userAgent || "",
		securityApiEnabled: conversation.meta?.securityApiEnabled ? "true" : "false",
		securityExternalApi: conversation.meta?.securityExternalApi || "",
	};

	// 각 메시지를 행으로 변환
	for (const message of conversation.messages) {
		const debugInfo = extractDebugInfo(message);

		// File 정보 추출 (파일명만)
		const fileNames = message.files?.map((f) => f.name).join("|") || "";
		const fileTypes = message.files?.map((f) => f.type).join("|") || "";
		const fileMimes = message.files?.map((f) => f.mime).join("|") || "";

		// Router 정보
		const routerRoute = message.routerMetadata?.route || "";
		const routerModel = message.routerMetadata?.model || "";
		const routerProvider = message.routerMetadata?.provider || "";

		// Ancestors/Children
		const ancestors = arrayToString(message.ancestors);
		const children = arrayToString(message.children);

		// Debug 정보 추출
		const hasDebugInfo = debugInfo ? "true" : "false";
		const inputSecurityApiStatus = debugInfo?.inputSecurityApiResponse?.status || "";
		const inputSecurityApiAction = debugInfo?.inputSecurityApiResponse?.data?.action || "";
		const inputSecurityApiDuration = debugInfo?.inputSecurityApiDuration?.toString() || "";
		const outputSecurityApiStatus = debugInfo?.outputSecurityApiResponse?.status || "";
		const outputSecurityApiAction = debugInfo?.outputSecurityApiResponse?.data?.action || "";
		const outputSecurityApiDuration = debugInfo?.outputSecurityApiDuration?.toString() || "";
		const llmResponseTime = debugInfo?.llmResponseTime?.toString() || "";
		const totalTime = debugInfo?.totalTime?.toString() || "";

		// Error 정보
		const hasInputSecurityError = debugInfo?.inputSecurityApiError ? "true" : "false";
		const hasOutputSecurityError = debugInfo?.outputSecurityApiError ? "true" : "false";
		const hasHandlerError = debugInfo?.handlerError ? "true" : "false";

		// Debug Summary JSON (간소화된 요약)
		const debugSummary = debugInfo
			? {
					hasSecurityProxiedData: !!debugInfo.securityProxiedData,
					inputSecurityApiStatus,
					outputSecurityApiStatus,
					totalTime,
				}
			: null;
		const debugSummaryJson = jsonToCsvString(debugSummary);

		const row = [
			convMeta.id,
			convMeta.title,
			convMeta.model,
			convMeta.createdAt,
			convMeta.updatedAt,
			convMeta.preprompt,
			convMeta.userAgent,
			convMeta.securityApiEnabled,
			convMeta.securityExternalApi,

			message.id,
			message.from,
			message.content,
			message.score?.toString() || "",
			message.interrupted ? "true" : "false",
			formatDate(message.createdAt),
			formatDate(message.updatedAt),
			routerRoute,
			routerModel,
			routerProvider,
			ancestors,
			children,

			message.files?.length.toString() || "0",
			fileNames,
			fileTypes,
			fileMimes,

			hasDebugInfo,
			inputSecurityApiStatus,
			inputSecurityApiAction,
			inputSecurityApiDuration,
			outputSecurityApiStatus,
			outputSecurityApiAction,
			outputSecurityApiDuration,
			llmResponseTime,
			totalTime,

			hasInputSecurityError,
			hasOutputSecurityError,
			hasHandlerError,
			debugSummaryJson,
		];

		rows.push(row);
	}

	return rows;
}

/**
 * CSV 셀 값 이스케이프 처리 (RFC 4180)
 */
function escapeCsvCell(value: string): string {
	// 값에 쉼표, 줄바꿈, 큰따옴표가 있으면 큰따옴표로 감싸고 내부 큰따옴표는 이중화
	if (value.includes(",") || value.includes("\n") || value.includes('"')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * CSV 파일 생성 (UTF-8 with BOM for Excel compatibility)
 */
export function generateCsv(rows: string[][], headers: readonly string[]): string {
	const BOM = "\uFEFF"; // UTF-8 BOM for Excel
	const lines: string[] = [];

	// 헤더 추가
	lines.push(headers.map(escapeCsvCell).join(","));

	// 데이터 행 추가
	for (const row of rows) {
		lines.push(row.map((cell) => escapeCsvCell(String(cell ?? ""))).join(","));
	}

	return BOM + lines.join("\n");
}

/**
 * Blob으로 변환하여 다운로드 준비
 */
export function createCsvBlob(csvContent: string): Blob {
	return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}

/**
 * 브라우저에서 CSV 파일 다운로드
 */
export function downloadCsv(csvContent: string, filename: string): void {
	const blob = createCsvBlob(csvContent);
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

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
	const sanitizedTitle = conversation.title.replace(/[^a-zA-Z0-9가-힣]/g, "_").substring(0, 50);
	const dateStr = new Date().toISOString().split("T")[0];
	const filename = `${sanitizedTitle}_${conversationId.substring(0, 8)}_${dateStr}.csv`;

	downloadCsv(csvContent, filename);
}

/**
 * 모든 대화를 하나의 CSV로 내보내기
 */
export async function exportAllConversationsToCsv(): Promise<void> {
	try {
		const conversations = await storage.getConversations();

		if (conversations.length === 0) {
			throw new Error("No conversations found");
		}

		const allRows: string[][] = [];

		for (const conversation of conversations) {
			const rows = conversationToCsvRows(conversation);
			allRows.push(...rows);
		}

		const csvContent = generateCsv(allRows, CSV_COLUMNS);

		const dateStr = new Date().toISOString().split("T")[0];
		const filename = `all_conversations_${dateStr}.csv`;

		downloadCsv(csvContent, filename);
	} catch (err) {
		// IndexedDB 접근 실패 시 에러를 다시 throw하여 UI에서 처리할 수 있도록 함
		console.error("Failed to export conversations:", err);
		throw err;
	}
}
