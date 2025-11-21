<script lang="ts">
	import { useSettingsStore } from "$lib/stores/settings";
	import CarbonClose from "~icons/carbon/close";
	import Modal from "$lib/components/Modal.svelte";
	import type { Model } from "$lib/types/Model";

	type NewChatMeta = {
		securityApiUrl?: string;
		securityExternalApi?: "AIM" | "APRISM" | "NONE";
		securityAimGuardType?: "both" | "input" | "output";
		securityAimGuardProjectId?: string;
		securityAprismApiType?: "identifier" | "risk-detector";
		securityAprismType?: "both" | "input" | "output";
		securityAprismExcludeLabels?: string;
	};

	interface Props {
		open: boolean;
		models: Model[];
		onclose?: () => void;
		onstart: (settings: { model: string; preprompt?: string; meta?: NewChatMeta }) => void;
	}

	const { open, models, onclose, onstart }: Props = $props();

	const settings = useSettingsStore();

	// Model selection
	let selectedModelId = $state(
		models.length > 0
			? (models.find((m) => m.id === $settings.activeModel)?.id ?? models[0].id)
			: ""
	);

	// Initialize settings from global settings
	let conversationSecurityApiUrl = $state($settings.securityApiUrl ?? "");
	let conversationSecurityExternalApi = $state<"AIM" | "APRISM" | "NONE">(
		$settings.securityExternalApi ?? "NONE"
	);
	let conversationSecurityAimGuardType = $state<"both" | "input" | "output">(
		$settings.securityAimGuardType ?? "both"
	);
	let conversationSecurityAimGuardProjectId = $state(
		$settings.securityAimGuardProjectId ?? "default"
	);
	let conversationSecurityAprismApiType = $state<"identifier" | "risk-detector">(
		$settings.securityAprismApiType ?? "identifier"
	);
	let conversationSecurityAprismType = $state<"both" | "input" | "output">(
		$settings.securityAprismType ?? "both"
	);
	let conversationSecurityAprismExcludeLabels = $state($settings.securityAprismExcludeLabels ?? "");
	let customPrompt = $state("");

	// Reset to global settings when modal opens
	$effect(() => {
		if (open) {
			conversationSecurityApiUrl = $settings.securityApiUrl ?? "";
			conversationSecurityExternalApi = $settings.securityExternalApi ?? "NONE";
			conversationSecurityAimGuardType = $settings.securityAimGuardType ?? "both";
			conversationSecurityAimGuardProjectId = $settings.securityAimGuardProjectId ?? "default";
			conversationSecurityAprismApiType = $settings.securityAprismApiType ?? "identifier";
			conversationSecurityAprismType = $settings.securityAprismType ?? "both";
			conversationSecurityAprismExcludeLabels = $settings.securityAprismExcludeLabels ?? "";
			customPrompt = "";
		}
	});

	const selectedModel = $derived(models.find((m) => m.id === selectedModelId));
	const globalPrompt = $derived(
		selectedModel ? $settings.customPrompts?.[selectedModel.id] || "" : ""
	);

	function handleStart() {
		if (!selectedModelId) {
			return;
		}

		const meta: NewChatMeta = {
			securityApiUrl: conversationSecurityApiUrl || undefined,
			securityExternalApi: conversationSecurityExternalApi,
			securityAimGuardType: conversationSecurityAimGuardType || undefined,
			securityAimGuardProjectId: conversationSecurityAimGuardProjectId || undefined,
			securityAprismApiType: conversationSecurityAprismApiType || undefined,
			securityAprismType: conversationSecurityAprismType || undefined,
			securityAprismExcludeLabels: conversationSecurityAprismExcludeLabels || undefined,
		};

		onstart({
			model: selectedModelId,
			preprompt: customPrompt.trim() || undefined,
			meta: Object.keys(meta).length > 0 ? meta : undefined,
		});

		onclose?.();
	}

	function handleClose() {
		onclose?.();
	}
</script>

{#if open}
	<Modal onclose={handleClose} width="!max-w-2xl" closeButton={true}>
		<div class="flex w-full flex-col gap-6 p-6">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">새 채팅 시작</h2>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto">
				<div class="space-y-6">
					<!-- Model Selection -->
					<div>
						<h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">모델 선택</h3>
						<select
							bind:value={selectedModelId}
							class="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
						>
							{#each models as model}
								<option value={model.id}>{model.displayName || model.name || model.id}</option>
							{/each}
						</select>
					</div>

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

					<!-- Custom Prompt -->
					{#if selectedModel}
						<div>
							<h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
								Custom Prompt
							</h3>
							<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
								Override system prompt for this conversation. Leave empty to use global setting.
							</p>
							<div class="space-y-2">
								<textarea
									bind:value={customPrompt}
									placeholder={globalPrompt || "Enter custom system prompt..."}
									class="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
									rows="4"
								></textarea>
								{#if !customPrompt && globalPrompt}
									<p class="text-[11px] text-gray-500 dark:text-gray-400">
										Using global setting: "{globalPrompt}"
									</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- API Settings -->
					<div>
						<div class="mb-2">
							<h3 class="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
								API Settings
							</h3>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								These settings override global settings from Application Settings for this
								conversation only.
							</p>
						</div>
						<div
							class="space-y-3 rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
						>
							<div>
								<div class="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
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
									API 키는 백엔드에서 자동으로 처리됩니다
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
												for="new-chat-aim-guard-type"
												class="block text-xs font-medium text-gray-700 dark:text-gray-300"
											>
												검증 타입
											</label>
											<select
												id="new-chat-aim-guard-type"
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
												for="new-chat-aim-guard-project-id"
												class="block text-xs font-medium text-gray-700 dark:text-gray-300"
											>
												프로젝트 ID (선택)
											</label>
											<input
												id="new-chat-aim-guard-project-id"
												type="text"
												bind:value={conversationSecurityAimGuardProjectId}
												placeholder="default"
												class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
											/>
											<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
												프로젝트별 정책 규칙을 사용하려면 프로젝트 ID를 입력하세요 (기본값:
												"default")
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
												for="new-chat-aprism-api-type"
												class="block text-xs font-medium text-gray-700 dark:text-gray-300"
											>
												API 타입
											</label>
											<select
												id="new-chat-aprism-api-type"
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
												for="new-chat-aprism-type"
												class="block text-xs font-medium text-gray-700 dark:text-gray-300"
											>
												처리 타입
											</label>
											<select
												id="new-chat-aprism-type"
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
												for="new-chat-aprism-exclude-labels"
												class="block text-xs font-medium text-gray-700 dark:text-gray-300"
											>
												제외 라벨 (선택, Identifier 전용)
											</label>
											<input
												id="new-chat-aprism-exclude-labels"
												type="text"
												bind:value={conversationSecurityAprismExcludeLabels}
												placeholder="EMAIL,PHONE_NUMBER"
												class="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
											/>
											<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
												마스킹하지 않을 PII 라벨을 콤마로 구분하여 입력합니다 (예:
												EMAIL,PHONE_NUMBER)
											</p>
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div
				class="flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700"
			>
				<button
					type="button"
					onclick={handleClose}
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
				>
					취소
				</button>
				<button
					type="button"
					onclick={handleStart}
					disabled={!selectedModelId}
					class="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-white dark:text-black dark:hover:bg-gray-200"
				>
					채팅 시작
				</button>
			</div>
		</div>
	</Modal>
{/if}
