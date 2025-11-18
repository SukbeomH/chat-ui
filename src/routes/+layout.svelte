<script lang="ts">
	import "../styles/main.css";

	import { onDestroy, onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import { browser } from "$app/environment";

	import { error } from "$lib/stores/errors";
	import { createSettingsStore } from "$lib/stores/settings";
	import { loading } from "$lib/stores/loading";

	import Toast from "$lib/components/Toast.svelte";
	import NavMenu from "$lib/components/NavMenu.svelte";
	import MobileNav from "$lib/components/MobileNav.svelte";
	import titleUpdate from "$lib/stores/titleUpdate";
	import ExpandNavigation from "$lib/components/ExpandNavigation.svelte";
	import { setContext } from "svelte";
	import { isAborted } from "$lib/stores/isAborted";
	import IconShare from "$lib/components/icons/IconShare.svelte";
	import { shareModal } from "$lib/stores/shareModal";
	import BackgroundGenerationPoller from "$lib/components/BackgroundGenerationPoller.svelte";
	import WelcomeModal from "$lib/components/WelcomeModal.svelte";
	import { requireAuthUser } from "$lib/utils/auth";
	import type { ConvSidebar } from "$lib/types/ConvSidebar";
	import {
		getConversations,
		deleteConversation as deleteConversationFromStorage,
		getConversation,
		saveConversation,
	} from "$lib/storage/conversations";
	import { getSettings as getSettingsFromStorage } from "$lib/storage/settings";

	const { data = $bindable(), children } = $props();

	setContext("publicConfig", data.publicConfig);

	const publicConfig = data.publicConfig;

	let conversations = $state<ConvSidebar[]>(data.conversations || []);

	let isNavCollapsed = $state(false);

	let errorToastTimeout: ReturnType<typeof setTimeout>;
	let currentError: string | undefined = $state();

	async function onError() {
		// If a new different error comes, wait for the current error to hide first
		if ($error && currentError && $error !== currentError) {
			clearTimeout(errorToastTimeout);
			currentError = undefined;
			await new Promise((resolve) => setTimeout(resolve, 300));
		}

		currentError = $error;

		errorToastTimeout = setTimeout(() => {
			$error = undefined;
			currentError = undefined;
		}, 5000);
	}

	const canShare = $derived(
		publicConfig.isHuggingChat &&
			Boolean(page.params?.id) &&
			page.route.id?.startsWith("/conversation/")
	);

	async function deleteConversation(id: string) {
		if (browser) {
			try {
				await deleteConversationFromStorage(id);
				conversations = conversations.filter((conv) => conv.id !== id);

				if (page.params.id === id) {
					await goto(`${base}/`, { invalidateAll: true });
				}
			} catch (err) {
				console.error(err);
				$error = String(err);
			}
		}
	}

	async function editConversationTitle(id: string, title: string) {
		if (browser) {
			try {
				const conv = await getConversation(id);
				if (conv) {
					conv.title = title;
					await saveConversation(conv);
					conversations = conversations.map((conv) => (conv.id === id ? { ...conv, title } : conv));
				}
			} catch (err) {
				console.error(err);
				$error = String(err);
			}
		}
	}

	onDestroy(() => {
		clearTimeout(errorToastTimeout);
		if (reloadTimeout) {
			clearTimeout(reloadTimeout);
		}
	});

	$effect(() => {
		if ($error) {
			onError();
		}
	});

	$effect(() => {
		if ($titleUpdate) {
			const convIdx = conversations.findIndex(({ id }) => id === $titleUpdate?.convId);

			if (convIdx !== -1) {
				conversations[convIdx].title = $titleUpdate?.title ?? conversations[convIdx].title;
			}

			$titleUpdate = null;
		}
	});

	// Reload conversations when page.data changes (e.g., when invalidate is called)
	$effect(() => {
		// Access page.data to create a dependency
		// When invalidate(UrlDependency.ConversationList) is called,
		// load function re-executes and page.data updates, triggering this effect
		if (browser && data) {
			reloadConversationsDebounced();
		}
	});

	const initialSettings = $state(data.settings);

	const settings = createSettingsStore(
		initialSettings || {
			shareConversationsWithModelAuthors: true,
			activeModel: data.models[0]?.id || "",
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
		}
	);

	// Global keyboard shortcut: New Chat (Ctrl/Cmd + Shift + O)
	function onKeydown(e: KeyboardEvent) {
		// Ignore when a modal has focus (app is inert)
		const appEl = document.getElementById("app");
		if (appEl?.hasAttribute("inert")) {
			return;
		}

		const oPressed = e.key?.toLowerCase() === "o";
		const metaOrCtrl = e.metaKey || e.ctrlKey;
		if (oPressed && e.shiftKey && metaOrCtrl) {
			e.preventDefault();
			isAborted.set(true);
			if (requireAuthUser()) {
				return;
			}
			goto(`${base}/`, { invalidateAll: true });
		}
	}

	// Reload conversations from IndexedDB
	// Preserves existing title updates that haven't been saved yet
	async function reloadConversations() {
		if (!browser) {
			return;
		}
		try {
			const convs = await getConversations(0);
			const newConversations = convs.map((conv) => ({
				id: conv.id,
				title: conv.title,
				updatedAt: conv.updatedAt instanceof Date ? conv.updatedAt : new Date(conv.updatedAt),
				createdAt: conv.createdAt instanceof Date ? conv.createdAt : new Date(conv.createdAt),
				model: conv.model,
				securityExternalApi: conv.securityExternalApi,
			}));

			// Merge with existing conversations to preserve title updates
			// If a conversation exists in both arrays, prefer the one with newer updatedAt
			// or the one that was recently updated via $titleUpdate
			const existingMap = new Map(conversations.map((conv) => [conv.id, conv]));
			const merged = newConversations.map((newConv) => {
				const existing = existingMap.get(newConv.id);
				if (existing) {
					// If existing conversation has a different title and it's not "New Chat",
					// it might be a recent update that hasn't been saved yet
					// Prefer the existing title if it's different from "New Chat" and the new one is "New Chat"
					// or if the existing title is more recent
					if (
						existing.title !== newConv.title &&
						existing.title !== "New Chat" &&
						(newConv.title === "New Chat" || existing.updatedAt >= newConv.updatedAt)
					) {
						return existing;
					}
				}
				return newConv;
			});

			// Add any conversations that exist in current list but not in new list
			// (shouldn't happen, but just in case)
			for (const existing of conversations) {
				if (!newConversations.find((c) => c.id === existing.id)) {
					merged.push(existing);
				}
			}

			conversations = merged;
		} catch (err) {
			console.error("Failed to load conversations from IndexedDB:", err);
		}
	}

	// Debounce reload to avoid excessive calls
	let reloadTimeout: ReturnType<typeof setTimeout> | undefined;
	function reloadConversationsDebounced() {
		if (reloadTimeout) {
			clearTimeout(reloadTimeout);
		}
		reloadTimeout = setTimeout(() => {
			reloadConversations();
		}, 100); // 100ms debounce
	}

	// Load conversations and settings from IndexedDB on mount
	onMount(async () => {
		if (browser) {
			// Load conversations
			await reloadConversations();

			// Load settings if not provided
			if (!initialSettings) {
				try {
					const loadedSettings = await getSettingsFromStorage();
					settings.set(loadedSettings);
				} catch (err) {
					console.error("Failed to load settings from IndexedDB:", err);
				}
			}
		}

		// Original onMount logic
		if (page.url.searchParams.has("model")) {
			await settings
				.instantSet({
					activeModel: page.url.searchParams.get("model") ?? $settings.activeModel,
				})
				.then(async () => {
					const query = new URLSearchParams(page.url.searchParams.toString());
					query.delete("model");
					await goto(`${base}/?${query.toString()}`, {
						invalidateAll: true,
					});
				});
		}

		if (page.url.searchParams.has("token")) {
			const token = page.url.searchParams.get("token");

			await fetch(`${base}/api/user/validate-token`, {
				method: "POST",
				body: JSON.stringify({ token }),
			}).then(() => {
				goto(`${base}/`, { invalidateAll: true });
			});
		}

		window.addEventListener("keydown", onKeydown, { capture: true });
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener("keydown", onKeydown, { capture: true });
		}
	});

	const mobileNavTitle = $derived(
		["/models", "/privacy"].includes(page.route.id ?? "")
			? ""
			: conversations.find((conv) => conv.id === page.params.id)?.title
	);

	// Welcome modal disabled - always hide
	const showWelcome = $derived(false);

	function closeWelcomeModal() {
		// Welcome modal is disabled, but function is required for component
	}
</script>

<svelte:head>
	<title>{publicConfig.PUBLIC_APP_NAME}</title>
	<meta name="description" content={publicConfig.PUBLIC_APP_DESCRIPTION} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@huggingface" />

	<!-- use those meta tags everywhere except on special listing pages -->
	<!-- feel free to refacto if there's a better way -->
	{#if !page.url.pathname.includes("/models/")}
		<meta property="og:title" content={publicConfig.PUBLIC_APP_NAME} />
		<meta property="og:type" content="website" />
		<meta property="og:url" content="{publicConfig.PUBLIC_ORIGIN || page.url.origin}{base}" />
		<meta property="og:image" content="{publicConfig.assetPath}/thumbnail.png" />
		<meta property="og:description" content={publicConfig.PUBLIC_APP_DESCRIPTION} />
	{/if}
	<link rel="icon" href="{publicConfig.assetPath}/icon.svg" type="image/svg+xml" />
	{#if publicConfig.PUBLIC_ORIGIN}
		<link
			rel="icon"
			href="{publicConfig.assetPath}/favicon.svg"
			type="image/svg+xml"
			media="(prefers-color-scheme: light)"
		/>
		<link
			rel="icon"
			href="{publicConfig.assetPath}/favicon-dark.svg"
			type="image/svg+xml"
			media="(prefers-color-scheme: dark)"
		/>
	{:else}
		<link rel="icon" href="{publicConfig.assetPath}/favicon-dev.svg" type="image/svg+xml" />
	{/if}
	<link rel="apple-touch-icon" href="{publicConfig.assetPath}/apple-touch-icon.png" />
	<link rel="manifest" href="{publicConfig.assetPath}/manifest.json" />
</svelte:head>

{#if showWelcome}
	<WelcomeModal close={closeWelcomeModal} />
{/if}

<BackgroundGenerationPoller />

<div
	class="fixed grid h-full w-screen grid-cols-1 grid-rows-[auto,1fr] overflow-hidden text-smd {!isNavCollapsed
		? 'md:grid-cols-[290px,1fr]'
		: 'md:grid-cols-[0px,1fr]'} transition-[300ms] [transition-property:grid-template-columns] dark:text-gray-300 md:grid-rows-[1fr]"
>
	<ExpandNavigation
		isCollapsed={isNavCollapsed}
		onClick={() => (isNavCollapsed = !isNavCollapsed)}
		classNames="absolute inset-y-0 z-10 my-auto {!isNavCollapsed
			? 'left-[290px]'
			: 'left-0'} *:transition-transform"
	/>

	{#if canShare}
		<button
			type="button"
			class="hidden size-8 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/90 text-sm font-medium text-gray-700 shadow-sm hover:bg-white/60 hover:text-gray-500 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 dark:hover:bg-gray-700 md:absolute md:right-6 md:top-5 md:flex
				{$loading ? 'cursor-not-allowed opacity-40' : ''}"
			onclick={() => shareModal.open()}
			aria-label="Share conversation"
			disabled={$loading}
		>
			<IconShare />
		</button>
	{/if}

	<MobileNav title={mobileNavTitle}>
		<NavMenu
			{conversations}
			user={data.user}
			ondeleteConversation={(id) => deleteConversation(id)}
			oneditConversationTitle={(payload) => editConversationTitle(payload.id, payload.title)}
		/>
	</MobileNav>
	<nav
		class="grid max-h-screen grid-cols-1 grid-rows-[auto,1fr,auto] overflow-hidden *:w-[290px] max-md:hidden"
	>
		<NavMenu
			{conversations}
			user={data.user}
			ondeleteConversation={(id) => deleteConversation(id)}
			oneditConversationTitle={(payload) => editConversationTitle(payload.id, payload.title)}
		/>
	</nav>
	{#if currentError}
		<Toast message={currentError} />
	{/if}
	{@render children?.()}
</div>
