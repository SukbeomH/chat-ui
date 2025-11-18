import type { Message } from "./Message";
import type { Timestamps } from "./Timestamps";
import type { Assistant } from "./Assistant";

export interface Conversation extends Timestamps {
	id: string;

	model: string;

	title: string;
	rootMessageId?: Message["id"];
	messages: Message[];

	meta?: {
		fromShareId?: string;
		// Security Proxy Handler settings (대화별 오버라이드)
		securityApiEnabled?: boolean;
		securityApiUrl?: string;
		securityExternalApi?: "AIM" | "APRISM" | "NONE";
		// AIM Guard settings
		securityAimGuardType?: "both" | "input" | "output";
		securityAimGuardProjectId?: string;
		// aprism settings
		securityAprismApiType?: "identifier" | "risk-detector";
		securityAprismType?: "both" | "input" | "output";
		securityAprismExcludeLabels?: string; // 콤마로 구분된 문자열
		// LLM API settings
		llmApiUrl?: string;
		llmApiKey?: string;
	};

	preprompt?: string;
	assistantId?: Assistant["_id"];

	userAgent?: string;
}
