<script lang="ts" module>
	export const titles: { [key: string]: string } = {
		today: "Today",
		week: "This week",
		month: "This month",
		older: "Older",
	} as const;
</script>

<script lang="ts">
	import { base } from "$app/paths";

	import Logo from "$lib/components/icons/Logo.svelte";
	import IconSun from "$lib/components/icons/IconSun.svelte";
	import IconMoon from "$lib/components/icons/IconMoon.svelte";
	import { switchTheme, subscribeToTheme } from "$lib/switchTheme";
	import { isAborted } from "$lib/stores/isAborted";
	import { onDestroy } from "svelte";

	import NavConversationItem from "./NavConversationItem.svelte";
	import type { LayoutData } from "../../routes/$types";
	import type { ConvSidebar } from "$lib/types/ConvSidebar";
	import type { Model } from "$lib/types/Model";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import InfiniteScroll from "./InfiniteScroll.svelte";
	import { CONV_NUM_PER_PAGE } from "$lib/constants/pagination";
	import { browser } from "$app/environment";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import { requireAuthUser } from "$lib/utils/auth";
	import { getConversations, deleteAllConversations } from "$lib/storage/conversations";
	import { exportAllConversationsToCsv } from "$lib/utils/csvExport";

	const publicConfig = usePublicConfig();

	interface Props {
		conversations: ConvSidebar[];
		user: LayoutData["user"];
		p?: number;
		ondeleteConversation?: (id: string) => void;
		oneditConversationTitle?: (payload: { id: string; title: string }) => void;
	}

	/* eslint-disable prefer-const */
	let {
		conversations = $bindable(),
		user,
		p = $bindable(0),
		ondeleteConversation,
		oneditConversationTitle,
	}: Props = $props();
	/* eslint-enable prefer-const */

	let hasMore = $state(true);
	let isExporting = $state(false);

	async function handleNewChatClick(e: MouseEvent) {
		isAborted.set(true);

		if (requireAuthUser()) {
			e.preventDefault();
			return;
		}

		e.preventDefault();

		// 홈으로 이동하면서 newChat 파라미터를 통해 설정 모달을 자동으로 연다
		await goto(`${base}/?newChat=1`);
	}

	function handleNavItemClick(e: MouseEvent) {
		if (requireAuthUser()) {
			e.preventDefault();
		}
	}

	async function handleExportClick() {
		if (isExporting) {
			return;
		}

		isExporting = true;
		try {
			await exportAllConversationsToCsv();
		} catch (err) {
			console.error("Export error:", err);
		} finally {
			isExporting = false;
		}
	}

	const dateRanges = [
		new Date().setDate(new Date().getDate() - 1),
		new Date().setDate(new Date().getDate() - 7),
		new Date().setMonth(new Date().getMonth() - 1),
	];

	const groupedConversations = $derived({
		today: conversations.filter(({ updatedAt }) => {
			const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
			return date.getTime() > dateRanges[0];
		}),
		week: conversations.filter(({ updatedAt }) => {
			const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
			return date.getTime() > dateRanges[1] && date.getTime() < dateRanges[0];
		}),
		month: conversations.filter(({ updatedAt }) => {
			const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
			return date.getTime() > dateRanges[2] && date.getTime() < dateRanges[1];
		}),
		older: conversations.filter(({ updatedAt }) => {
			const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
			return date.getTime() < dateRanges[2];
		}),
	});

	async function handleVisible() {
		if (!browser) {
			return;
		}

		p++;
		try {
			const newConvs = await getConversations(p);
			const convSidebar: ConvSidebar[] = newConvs.map((conv) => ({
				id: conv.id,
				title: conv.title,
				updatedAt: conv.updatedAt instanceof Date ? conv.updatedAt : new Date(conv.updatedAt),
				createdAt: conv.createdAt instanceof Date ? conv.createdAt : new Date(conv.createdAt),
				model: conv.model,
				securityExternalApi: conv.securityExternalApi,
			}));

			if (convSidebar.length === 0) {
				hasMore = false;
			}

			conversations = [...conversations, ...convSidebar];
		} catch (err) {
			console.error("Failed to load more conversations:", err);
			hasMore = false;
		}
	}

	$effect(() => {
		if (conversations.length <= CONV_NUM_PER_PAGE) {
			// reset p to 0 if there's only one page of content
			// that would be caused by a data loading invalidation
			p = 0;
		}
	});

	let isDark = $state(false);
	let unsubscribeTheme: (() => void) | undefined;

	if (browser) {
		unsubscribeTheme = subscribeToTheme(({ isDark: nextIsDark }) => {
			isDark = nextIsDark;
		});
	}

	onDestroy(() => {
		unsubscribeTheme?.();
	});

	async function handleDeleteAllClick() {
		if (requireAuthUser()) {
			return;
		}

		if (!browser) {
			return;
		}

		// 사용자가 실수로 누르지 않도록 확인 다이얼로그 표시
		// eslint-disable-next-line no-alert
		const confirmed = window.confirm("모든 대화 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
		if (!confirmed) {
			return;
		}

		try {
			await deleteAllConversations();
			conversations = [];

			// 현재 보고 있는 대화가 삭제되었을 수 있으므로 루트로 이동
			if (page.route.id === "/conversation/[id]") {
				await goto(`${base}/`, { replaceState: true });
			}
		} catch (err) {
			// 에러는 콘솔에만 남기고 UI는 조용히 유지
			// eslint-disable-next-line no-console
			console.error("Failed to delete all conversations:", err);
		}
	}
</script>

<div
	class="sticky top-0 flex flex-none touch-none flex-col items-center gap-2 px-1.5 py-3.5 max-sm:pt-0"
>
	<a
		class="flex select-none items-center rounded-xl text-lg font-semibold"
		href="{publicConfig.PUBLIC_ORIGIN}{base}/"
	>
		<Logo classNames="dark:invert mr-[2px]" />
		{publicConfig.PUBLIC_APP_NAME}
	</a>
	<button
		type="button"
		onclick={handleNewChatClick}
		class="flex rounded-lg border bg-white px-2 py-0.5 text-center text-sm shadow-sm hover:shadow-none dark:border-gray-600 dark:bg-gray-700 sm:text-smd"
		title="Ctrl/Cmd + Shift + O"
	>
		New Chat
	</button>
</div>

<div
	class="scrollbar-custom flex touch-pan-y flex-col gap-1 overflow-y-auto rounded-r-xl border border-l-0 border-gray-100 from-gray-50 px-3 pb-3 pt-2 text-[.9rem] dark:border-transparent dark:from-gray-800/30 max-sm:bg-gradient-to-t md:bg-gradient-to-l"
>
	<div class="flex flex-col gap-0.5">
		{#each Object.entries(groupedConversations) as [group, convs]}
			{#if convs.length}
				<h4 class="mb-1.5 mt-4 pl-0.5 text-sm text-gray-400 first:mt-0 dark:text-gray-500">
					{titles[group]}
				</h4>
				{#each convs as conv}
					<NavConversationItem {conv} {oneditConversationTitle} {ondeleteConversation} />
				{/each}
			{/if}
		{/each}
	</div>
	{#if hasMore}
		<InfiniteScroll onvisible={handleVisible} />
	{/if}
</div>
<div
	class="flex touch-none flex-col gap-1 rounded-r-xl border border-l-0 border-gray-100 p-3 text-sm dark:border-transparent md:mt-3 md:bg-gradient-to-l md:from-gray-50 md:dark:from-gray-800/30"
>
	{#if user?.username || user?.email}
		<div
			class="group flex items-center gap-1.5 rounded-lg pl-2.5 pr-2 hover:bg-gray-100 dark:hover:bg-gray-700"
		>
			<span
				class="flex h-9 flex-none shrink items-center gap-1.5 truncate pr-2 text-gray-500 dark:text-gray-400"
				>{user?.username || user?.email}</span
			>

			<img
				src="https://huggingface.co/api/users/{user.username}/avatar?redirect=true"
				class="ml-auto size-4 rounded-full border bg-gray-500 dark:border-white/40"
				alt=""
			/>
		</div>
	{/if}

	<span class="flex gap-1">
		<div class="flex flex-1 flex-col gap-1">
			<button
				type="button"
				onclick={handleExportClick}
				disabled={isExporting}
				class="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-black px-4 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-gray-200"
			>
				{isExporting ? "Exporting..." : "Data Export"}
			</button>
			<button
				type="button"
				onclick={handleDeleteAllClick}
				class="flex h-8 w-full items-center justify-center rounded-lg border border-red-500 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/70 dark:text-red-300 dark:hover:bg-red-900/30"
			>
				모든 대화 삭제
			</button>
		</div>
		<button
			onclick={() => {
				switchTheme();
			}}
			aria-label="Toggle theme"
			class="flex size-9 min-w-[1.5em] flex-none items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
		>
			{#if browser}
				{#if isDark}
					<IconSun />
				{:else}
					<IconMoon />
				{/if}
			{/if}
		</button>
	</span>
</div>
