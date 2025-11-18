import type { Timestamps } from "./Timestamps";

export interface Settings extends Timestamps {
	id?: string;

	shareConversationsWithModelAuthors: boolean;
	/** One-time welcome modal acknowledgement */
	welcomeModalSeenAt?: Date | null;
	activeModel: string;

	// model name and system prompts
	customPrompts?: Record<string, string>;

	/**
	 * Per‑model overrides to enable multimodal (image) support
	 * even when not advertised by the provider/model list.
	 * Only the `true` value is meaningful (enables images).
	 */
	multimodalOverrides?: Record<string, boolean>;

	/**
	 * Per-model toggle to hide Omni prompt suggestions shown near the composer.
	 * When set to `true`, prompt examples for that model are suppressed.
	 */
	hidePromptExamples?: Record<string, boolean>;

	disableStream: boolean;
	directPaste: boolean;

	// Security Proxy Handler settings
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

	// LLM API override settings
	llmApiUrl?: string;
	llmApiKey?: string;
}

export type SettingsEditable = Omit<Settings, "welcomeModalSeenAt" | "createdAt" | "updatedAt">;
// TODO: move this to a constant file along with other constants
// Note: activeModel is set to empty string - should be populated from models list on client side
export const DEFAULT_SETTINGS = {
	shareConversationsWithModelAuthors: true,
	activeModel: "", // Will be set from models list on client side
	customPrompts: {},
	multimodalOverrides: {},
	hidePromptExamples: {},
	disableStream: false,
	directPaste: false,
	securityApiEnabled: false,
	securityApiUrl: "",
	securityExternalApi: "NONE",
	securityAimGuardType: "both",
	securityAimGuardProjectId: "default",
	securityAprismApiType: "identifier",
	securityAprismType: "both",
	securityAprismExcludeLabels: "",
	llmApiUrl: "",
	llmApiKey: "",
} satisfies SettingsEditable;
