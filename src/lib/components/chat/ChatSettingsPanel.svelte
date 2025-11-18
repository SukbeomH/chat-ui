<script lang="ts">
	import { useSettingsStore } from "$lib/stores/settings";
	import CarbonClose from "~icons/carbon/close";
	import CarbonSettings from "~icons/carbon/settings";
	import { fly } from "svelte/transition";
	import { cubicInOut } from "svelte/easing";
	import Switch from "$lib/components/Switch.svelte";
	import type { Conversation } from "$lib/types/Conversation";

	/* eslint-disable prefer-const */
	let {
		open = $bindable(false),
		onclose,
		conversation = null,
		onConversationUpdate,
	} = $props<{
		open?: boolean;
		onclose?: () => void;
		conversation?: Conversation | null;
		onConversationUpdate?: (updates: Partial<Conversation>) => void;
	}>();
	/* eslint-enable prefer-const */

	const settings = useSettingsStore();

	// Initialize conversation-specific settings from conversation meta or fallback to global settings
	let conversationSecurityApiEnabled = $state(
		conversation?.meta?.securityApiEnabled ?? $settings.securityApiEnabled ?? false
	);
	let conversationSecurityApiUrl = $state(
		conversation?.meta?.securityApiUrl ?? $settings.securityApiUrl ?? ""
	);
	let conversationSecurityExternalApi = $state<"AIM" | "APRISM" | "NONE">(
		conversation?.meta?.securityExternalApi ?? $settings.securityExternalApi ?? "NONE"
	);
	let conversationSecurityAimGuardType = $state<"both" | "input" | "output">(
		conversation?.meta?.securityAimGuardType ??
			$settings.securityAimGuardType ??
			"both"
	);
	let conversationSecurityAimGuardProjectId = $state(
		conversation?.meta?.securityAimGuardProjectId ??
			$settings.securityAimGuardProjectId ??
			"default"
	);
	let conversationSecurityAprismApiType = $state<"identifier" | "risk-detector">(
		conversation?.meta?.securityAprismApiType ??
			$settings.securityAprismApiType ??
			"identifier"
	);
	let conversationSecurityAprismType = $state<"both" | "input" | "output">(
		conversation?.meta?.securityAprismType ?? $settings.securityAprismType ?? "both"
	);
	let conversationSecurityAprismExcludeLabels = $state(
		conversation?.meta?.securityAprismExcludeLabels ??
			$settings.securityAprismExcludeLabels ??
			""
	);
	let conversationLlmApiUrl = $state(conversation?.meta?.llmApiUrl ?? $settings.llmApiUrl ?? "");
	let conversationLlmApiKey = $state(conversation?.meta?.llmApiKey ?? $settings.llmApiKey ?? "");

	// Update local state when conversation or its meta changes
	$effect(() => {
		// Track open state to reinitialize when modal opens
		void open;

		// Only update state when modal is open
		if (!open) {
			return;
		}

		// Track conversation and its meta to detect changes
		void conversation?.id;
		void conversation?.model;
		void conversation?.meta?.securityApiEnabled;
		void conversation?.meta?.securityApiUrl;
		void conversation?.meta?.securityExternalApi;
		void conversation?.meta?.securityAimGuardType;
		void conversation?.meta?.securityAimGuardProjectId;
		void conversation?.meta?.securityAprismApiType;
		void conversation?.meta?.securityAprismType;
		void conversation?.meta?.securityAprismExcludeLabels;
		void conversation?.meta?.llmApiUrl;
		void conversation?.meta?.llmApiKey;

		// Track global settings that are used as fallbacks
		void $settings.securityApiEnabled;
		void $settings.securityApiUrl;
		void $settings.securityExternalApi;
		void $settings.securityAimGuardType;
		void $settings.securityAimGuardProjectId;
		void $settings.securityAprismApiType;
		void $settings.securityAprismType;
		void $settings.securityAprismExcludeLabels;
		void $settings.llmApiUrl;
		void $settings.llmApiKey;
		void $settings.customPrompts;

		if (conversation) {
			conversationSecurityApiEnabled =
				conversation.meta?.securityApiEnabled ?? $settings.securityApiEnabled ?? false;
			conversationSecurityApiUrl =
				conversation.meta?.securityApiUrl ?? $settings.securityApiUrl ?? "";
			conversationSecurityExternalApi =
				conversation.meta?.securityExternalApi ?? $settings.securityExternalApi ?? "NONE";
			conversationSecurityAimGuardType =
				conversation.meta?.securityAimGuardType ??
				$settings.securityAimGuardType ??
				"both";
			conversationSecurityAimGuardProjectId =
				conversation.meta?.securityAimGuardProjectId ??
				$settings.securityAimGuardProjectId ??
				"default";
			conversationSecurityAprismApiType =
				conversation.meta?.securityAprismApiType ??
				$settings.securityAprismApiType ??
				"identifier";
			conversationSecurityAprismType =
				conversation.meta?.securityAprismType ?? $settings.securityAprismType ?? "both";
			conversationSecurityAprismExcludeLabels =
				conversation.meta?.securityAprismExcludeLabels ??
				$settings.securityAprismExcludeLabels ??
				"";
			conversationLlmApiUrl = conversation.meta?.llmApiUrl ?? $settings.llmApiUrl ?? "";
			conversationLlmApiKey = conversation.meta?.llmApiKey ?? $settings.llmApiKey ?? "";
		} else {
			// Reset to global settings when conversation is null
			conversationSecurityApiEnabled = $settings.securityApiEnabled ?? false;
			conversationSecurityApiUrl = $settings.securityApiUrl ?? "";
			conversationSecurityExternalApi = $settings.securityExternalApi ?? "NONE";
			conversationSecurityAimGuardType = $settings.securityAimGuardType ?? "both";
			conversationSecurityAimGuardProjectId = $settings.securityAimGuardProjectId ?? "default";
			conversationSecurityAprismApiType = $settings.securityAprismApiType ?? "identifier";
			conversationSecurityAprismType = $settings.securityAprismType ?? "both";
			conversationSecurityAprismExcludeLabels = $settings.securityAprismExcludeLabels ?? "";
			conversationLlmApiUrl = $settings.llmApiUrl ?? "";
			conversationLlmApiKey = $settings.llmApiKey ?? "";
		}
	});

	function updateConversationMeta() {
		if (!onConversationUpdate || !conversation) {
			return;
		}

		// Always save conversation-specific settings when conversation exists
		onConversationUpdate({
			meta: {
				...conversation.meta,
				securityApiEnabled: conversationSecurityApiEnabled,
				securityApiUrl: conversationSecurityApiUrl || undefined,
				securityExternalApi: conversationSecurityExternalApi,
				securityAimGuardType: conversationSecurityAimGuardType || undefined,
				securityAimGuardProjectId: conversationSecurityAimGuardProjectId || undefined,
				securityAprismApiType: conversationSecurityAprismApiType || undefined,
				securityAprismType: conversationSecurityAprismType || undefined,
				securityAprismExcludeLabels: conversationSecurityAprismExcludeLabels || undefined,
				llmApiUrl: conversationLlmApiUrl || undefined,
				llmApiKey: conversationLlmApiKey || undefined,
			},
		});
	}

	// Debounce conversation meta updates
	let metaUpdateTimeout: ReturnType<typeof setTimeout> | undefined;
	function scheduleMetaUpdate() {
		if (!conversation) {
			return;
		}
		clearTimeout(metaUpdateTimeout);
		metaUpdateTimeout = setTimeout(() => {
			updateConversationMeta();
		}, 300);
	}

	// Auto-save when conversation-specific settings change
	$effect(() => {
		// Track all conversation-specific settings
		void conversationSecurityApiEnabled;
		void conversationSecurityApiUrl;
		void conversationSecurityExternalApi;
		void conversationSecurityAimGuardType;
		void conversationSecurityAimGuardProjectId;
		void conversationSecurityAprismApiType;
		void conversationSecurityAprismType;
		void conversationSecurityAprismExcludeLabels;
		void conversationLlmApiUrl;
		void conversationLlmApiKey;

		scheduleMetaUpdate();
		return () => clearTimeout(metaUpdateTimeout);
	});
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/20 dark:bg-black/40"
		role="button"
		tabindex="-1"
		onclick={() => {
			open = false;
			onclose?.();
		}}
		onkeydown={(e) => {
			if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
				open = false;
				onclose?.();
			}
		}}
		transition:fly={{ opacity: 0, duration: 200 }}
	></div>

	<div
		class="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-xl dark:bg-gray-900 md:w-96"
		role="dialog"
		aria-modal="true"
		aria-labelledby="chat-settings-title"
		tabindex="-1"
		transition:fly={{ x: 400, duration: 300, easing: cubicInOut }}
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => {
			// Prevent keyboard events from propagating, but don't handle them here
			e.stopPropagation();
		}}
	>
		<div class="flex h-full flex-col">
			<!-- Header -->
			<div
				class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700"
			>
				<div class="flex items-center gap-2">
					<CarbonSettings class="h-5 w-5 text-gray-600 dark:text-gray-400" />
					<div>
						<h2
							id="chat-settings-title"
							class="text-lg font-semibold text-gray-900 dark:text-gray-100"
						>
							Chat Settings
						</h2>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							Settings apply to this conversation only
						</p>
					</div>
				</div>
				<button
					onclick={() => {
						open = false;
						onclose?.();
					}}
					class="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
					aria-label="Close settings"
				>
					<CarbonClose class="h-5 w-5 text-gray-600 dark:text-gray-400" />
				</button>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto p-4">
				<div class="space-y-6">
					<!-- Generation Settings -->
					<div>
						<h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
							Generation Settings
						</h3>
						<div class="space-y-3">
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									bind:checked={$settings.directPaste}
									onchange={() => {
										settings.set({ directPaste: $settings.directPaste });
									}}
									class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
								<span class="text-sm text-gray-700 dark:text-gray-300">Direct paste</span>
							</label>
						</div>
					</div>

					<!-- Custom Prompts -->
					{#if conversation?.model}
						{@const globalPrompt = $settings.customPrompts?.[conversation.model] || ""}
						{@const conversationPrompt = conversation.preprompt || ""}
						<div>
							<h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
								Custom Prompt
							</h3>
							<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
								Override system prompt for this conversation. Leave empty to use global setting.
							</p>
							<div class="space-y-2">
								<textarea
									value={conversationPrompt}
									placeholder={globalPrompt || "Enter custom system prompt..."}
									oninput={(e) => {
										const newValue = e.currentTarget.value.trim();
										if (onConversationUpdate) {
											onConversationUpdate({
												preprompt: newValue || undefined,
											});
										}
									}}
									class="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
									rows="4"
								></textarea>
								{#if !conversationPrompt && globalPrompt}
									<p class="text-[11px] text-gray-500 dark:text-gray-400">
										Using global setting: "{globalPrompt}"
									</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Conversation-Specific Settings -->
					<div>
						<div class="mb-2">
							<h3 class="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
								API Settings
							</h3>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								These settings override global settings from Application Settings for this
								conversation only.
								{#if !conversation}
									<span class="mt-1 block text-orange-600 dark:text-orange-400">
										Start a conversation to save these settings.
									</span>
								{/if}
							</p>
						</div>
						<div
							class="space-y-3 rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="text-xs font-medium text-gray-700 dark:text-gray-300">
										Enable Security API
									</div>
								</div>
								<Switch
									name="conversationSecurityApiEnabled"
									bind:checked={conversationSecurityApiEnabled}
								/>
							</div>

							<div>
								<div class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
									Security API Selection
								</div>
								<div class="space-y-2">
									<label class="flex items-center">
										<input
											type="radio"
											name="conversationSecurityExternalApi"
											value="AIM"
											bind:group={conversationSecurityExternalApi}
											class="mr-2"
										/>
										<span class="text-xs text-gray-700 dark:text-gray-300">AIM Guard</span>
									</label>
									<label class="flex items-center">
										<input
											type="radio"
											name="conversationSecurityExternalApi"
											value="APRISM"
											bind:group={conversationSecurityExternalApi}
											class="mr-2"
										/>
										<span class="text-xs text-gray-700 dark:text-gray-300">aprism</span>
									</label>
									<label class="flex items-center">
										<input
											type="radio"
											name="conversationSecurityExternalApi"
											value="NONE"
											bind:group={conversationSecurityExternalApi}
											class="mr-2"
										/>
										<span class="text-xs text-gray-700 dark:text-gray-300">사용 안함</span>
									</label>
								</div>
								<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
									API 키는 서버 환경 변수에서 자동으로 읽습니다 (AIM_GUARD_KEY, APRISM_INFERENCE_KEY)
								</p>
							</div>

							{#if conversationSecurityExternalApi === "AIM"}
								<div
									class="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50"
								>
									<div class="mb-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
										AIM Guard Settings
									</div>
									<div class="space-y-3">
										<div>
											<label
												for="conversation-aim-guard-type"
												class="block text-xs font-medium text-gray-700 dark:text-gray-300"
											>
												검증 타입
											</label>
											<select
												id="conversation-aim-guard-type"
												bind:value={conversationSecurityAimGuardType}
												class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
											>
												<option value="both">both (input + output)</option>
												<option value="input">input only</option>
												<option value="output">output only</option>
											</select>
											<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
												입력과 출력 중 어느 것을 검증할지 선택합니다 (기본값: both)
											</p>
										</div>
										<div>
											<label
												for="conversation-aim-guard-project-id"
												class="block text-xs font-medium text-gray-700 dark:text-gray-300"
											>
												프로젝트 ID (선택)
											</label>
											<input
												id="conversation-aim-guard-project-id"
												type="text"
												bind:value={conversationSecurityAimGuardProjectId}
												placeholder="default"
												class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
											/>
											<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
												프로젝트별 정책 규칙을 사용하려면 프로젝트 ID를 입력하세요 (기본값: "default")
											</p>
										</div>
									</div>
								</div>
							{/if}

							{#if conversationSecurityExternalApi === "APRISM"}
								<div
									class="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/50"
								>
									<div class="mb-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
										aprism Settings
									</div>
									<div class="space-y-3">
										<div>
											<label
												for="conversation-aprism-api-type"
												class="block text-xs font-medium text-gray-700 dark:text-gray-300"
											>
												API 타입
											</label>
											<select
												id="conversation-aprism-api-type"
												bind:value={conversationSecurityAprismApiType}
												class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
											>
												<option value="identifier">identifier (PII 탐지 및 마스킹)</option>
												<option value="risk-detector">risk-detector (위험 탐지)</option>
											</select>
											<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
												사용할 aprism API를 선택합니다 (기본값: identifier)
											</p>
										</div>
										<div>
											<label
												for="conversation-aprism-type"
												class="block text-xs font-medium text-gray-700 dark:text-gray-300"
											>
												처리 타입
											</label>
											<select
												id="conversation-aprism-type"
												bind:value={conversationSecurityAprismType}
												class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
											>
												<option value="both">both (input + output)</option>
												<option value="input">input only</option>
												<option value="output">output only</option>
											</select>
											<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
												입력과 출력 중 어느 것을 처리할지 선택합니다 (기본값: both)
											</p>
										</div>
										<div>
											<label
												for="conversation-aprism-exclude-labels"
												class="block text-xs font-medium text-gray-700 dark:text-gray-300"
											>
												제외 라벨 (선택, Identifier 전용)
											</label>
											<input
												id="conversation-aprism-exclude-labels"
												type="text"
												bind:value={conversationSecurityAprismExcludeLabels}
												placeholder="EMAIL,PHONE_NUMBER"
												class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
											/>
											<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
												마스킹하지 않을 PII 라벨을 콤마로 구분하여 입력합니다 (예: EMAIL,PHONE_NUMBER)
											</p>
										</div>
									</div>
								</div>
							{/if}
							<div>
								<label
									for="llm-api-url"
									class="block text-xs font-medium text-gray-700 dark:text-gray-300"
								>
									LLM API URL (Optional)
								</label>
								<input
									id="llm-api-url"
									type="text"
									bind:value={conversationLlmApiUrl}
									placeholder="https://api.openai.com/v1"
									class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
								/>
							</div>
							<div>
								<label
									for="llm-api-key"
									class="block text-xs font-medium text-gray-700 dark:text-gray-300"
								>
									LLM API Key (Optional)
								</label>
								<input
									id="llm-api-key"
									type="password"
									bind:value={conversationLlmApiKey}
									placeholder="sk-..."
									class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
