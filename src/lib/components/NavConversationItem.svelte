<script lang="ts">
	import { base } from "$app/paths";
	import { page } from "$app/state";

	import CarbonCheckmark from "~icons/carbon/checkmark";
	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonClose from "~icons/carbon/close";
	import CarbonEdit from "~icons/carbon/edit";
	import type { ConvSidebar } from "$lib/types/ConvSidebar";
	import type { Model } from "$lib/types/Model";

	import EditConversationModal from "$lib/components/EditConversationModal.svelte";
	import { requireAuthUser } from "$lib/utils/auth";

	interface Props {
		conv: ConvSidebar;
		readOnly?: true;
		ondeleteConversation?: (id: string) => void;
		oneditConversationTitle?: (payload: { id: string; title: string }) => void;
	}

	const { conv, readOnly, ondeleteConversation, oneditConversationTitle }: Props = $props();

	let confirmDelete = $state(false);
	let renameOpen = $state(false);

	function formatDateTime(date: Date): string {
		const d = date instanceof Date ? date : new Date(date);
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		const hours = String(d.getHours()).padStart(2, "0");
		const minutes = String(d.getMinutes()).padStart(2, "0");
		return `${year}-${month}-${day} ${hours}:${minutes}`;
	}

	const formattedDateTime = $derived(formatDateTime(conv.createdAt));

	// Get model display name
	const modelDisplayName = $derived.by(() => {
		if (!conv.model || !page.data.models) {
			return null;
		}
		const model = (page.data.models as Model[]).find((m) => m.id === conv.model);
		return model?.displayName ?? conv.model;
	});

	// Get security API display text
	const securityApiText = $derived.by(() => {
		return conv.securityExternalApi ?? "NONE";
	});

	// Get security API color class based on type
	const securityApiColorClass = $derived.by(() => {
		const apiType = conv.securityExternalApi ?? "NONE";
		switch (apiType) {
			case "APRISM":
				return "text-purple-600 dark:text-purple-400";
			case "AIM":
				return "text-green-600 dark:text-green-400";
			case "NONE":
			default:
				return "text-gray-500 dark:text-gray-400";
		}
	});
</script>

<a
	data-sveltekit-noscroll
	onmouseleave={() => {
		confirmDelete = false;
	}}
	href="{base}/conversation/{conv.id}"
	class="group flex min-h-[2.15rem] flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 max-sm:min-h-10
		{conv.id === page.params.id ? 'bg-gray-100 dark:bg-gray-700' : ''}"
>
	<div class="my-2 min-w-0 flex-1 truncate first-letter:uppercase">
		<div class="flex flex-col">
			<span>
				{#if confirmDelete}
					<span class="mr-1 font-semibold"> Delete? </span>
				{/if}
				{conv.title}
				<span class="ml-1.5 text-xs text-gray-400 dark:text-gray-500">- {formattedDateTime}</span>
			</span>
			{#if modelDisplayName || securityApiText}
				<div class="mt-0.5 flex flex-wrap gap-1.5 text-[0.7rem]">
					{#if modelDisplayName}
						<span class="text-blue-600 dark:text-blue-400 font-medium">{modelDisplayName}</span>
					{/if}
					{#if securityApiText}
						<span class="{securityApiColorClass} font-medium">{securityApiText}</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	{#if !readOnly}
		{#if confirmDelete}
			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded md:hidden md:group-hover:flex"
				title="Cancel delete action"
				onclick={(e) => {
					e.preventDefault();
					if (requireAuthUser()) {
						return;
					}
					confirmDelete = false;
				}}
			>
				<CarbonClose class="text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" />
			</button>
			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded md:hidden md:group-hover:flex"
				title="Confirm delete action"
				onclick={(e) => {
					e.preventDefault();
					if (requireAuthUser()) {
						return;
					}
					confirmDelete = false;
					ondeleteConversation?.(conv.id.toString());
				}}
			>
				<CarbonCheckmark
					class="text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
				/>
			</button>
		{:else}
			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded md:hidden md:group-hover:flex"
				title="Edit conversation title"
				onclick={(e) => {
					e.preventDefault();
					if (requireAuthUser()) {
						return;
					}
					renameOpen = true;
				}}
			>
				<CarbonEdit class="text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" />
			</button>

			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded md:hidden md:group-hover:flex"
				title="Delete conversation"
				onclick={(event) => {
					event.preventDefault();
					if (requireAuthUser()) {
						return;
					}
					if (event.shiftKey) {
						ondeleteConversation?.(conv.id.toString());
					} else {
						confirmDelete = true;
					}
				}}
			>
				<CarbonTrashCan
					class="text-xs text-gray-400  hover:text-gray-500 dark:hover:text-gray-300"
				/>
			</button>
		{/if}
	{/if}
</a>

<!-- Edit title modal -->
{#if renameOpen}
	<EditConversationModal
		open={renameOpen}
		title={conv.title}
		onclose={() => (renameOpen = false)}
		onsave={(payload) => {
			renameOpen = false;
			oneditConversationTitle?.({ id: conv.id.toString(), title: payload.title });
		}}
	/>
{/if}
