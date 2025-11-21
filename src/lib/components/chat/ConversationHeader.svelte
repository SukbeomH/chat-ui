<script lang="ts">
	import type { Conversation } from "$lib/types/Conversation";
	import type { Model } from "$lib/types/Model";

	interface Props {
		conversation: Conversation;
		currentModel: Model;
	}

	const { conversation, currentModel }: Props = $props();

	const securityApiType = $derived(
		conversation.meta?.securityExternalApi ?? "NONE"
	);
	const hasCustomPrompt = $derived(Boolean(conversation.preprompt));

	function getSecurityApiLabel(type: string): string {
		switch (type) {
			case "AIM":
				return "AIM Guard";
			case "APRISM":
				return "aprism";
			case "NONE":
			default:
				return "Security API 없음";
		}
	}
</script>

<div
	class="flex w-full flex-wrap items-center gap-2 border-b border-gray-200 -mx-5 px-5 py-3 mb-6 dark:border-gray-700"
>
	<!-- Model Name -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">모델:</span>
		<span class="text-sm text-gray-700 dark:text-gray-300">
			{currentModel.displayName || currentModel.name || currentModel.id}
		</span>
	</div>

	<!-- Separator -->
	<div class="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>

	<!-- Security API Badge -->
	<div
		class="rounded-full border px-2.5 py-0.5 text-xs font-medium {securityApiType === 'NONE'
			? 'border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
			: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}"
	>
		{getSecurityApiLabel(securityApiType)}
	</div>

	<!-- Custom Prompt Badge -->
	{#if hasCustomPrompt}
		<div
			class="rounded-full border border-purple-300 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
		>
			Custom Prompt
		</div>
	{/if}
</div>

