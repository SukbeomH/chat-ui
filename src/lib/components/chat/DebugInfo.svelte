<script lang="ts">
	import type { MessageDebugUpdate } from "$lib/types/MessageUpdate";
	import type { SecurityProxiedData } from "$lib/server/security/securityApi";
	import CarbonChevronDown from "~icons/carbon/chevron-down";
	import CarbonChevronUp from "~icons/carbon/chevron-up";

	const { debugUpdate } = $props<{
		debugUpdate: MessageDebugUpdate;
	}>();
	let expanded = $state(false);

	// Helper function to get security details
	function getSecurityDetails() {
		const securityProxiedData = debugUpdate.securityProxiedData as SecurityProxiedData | undefined;
		if (!securityProxiedData) return null;

		return {
			aimGuardDetails: securityProxiedData.aim_guard_details,
			aprismDetails: securityProxiedData.aprism_details,
		};
	}

	const securityDetails = getSecurityDetails();
</script>

<div
	class="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-800/50"
>
	<button
		onclick={() => (expanded = !expanded)}
		class="flex w-full items-center justify-between text-left font-semibold text-gray-700 dark:text-gray-300"
	>
		<span>🔍 Debug Information</span>
		{#if expanded}
			<CarbonChevronUp class="h-4 w-4" />
		{:else}
			<CarbonChevronDown class="h-4 w-4" />
		{/if}
	</button>

	{#if expanded}
		<div class="mt-2 space-y-3">
			<!-- Timing Information -->
			<div
				class="rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="text-xs font-semibold text-gray-700 dark:text-gray-300">Timing Information</div>
				<div class="mt-1 space-y-1 text-xs">
					{#if debugUpdate.inputSecurityApiDuration !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Input Security API Duration:</span>
							<span class="font-mono">{debugUpdate.inputSecurityApiDuration.toFixed(0)}ms</span>
						</div>
					{/if}
					{#if debugUpdate.outputSecurityApiDuration !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">Output Security API Duration:</span>
							<span class="font-mono">{debugUpdate.outputSecurityApiDuration.toFixed(0)}ms</span>
						</div>
					{/if}
					{#if debugUpdate.llmResponseTime !== undefined}
						<div class="flex justify-between">
							<span class="text-gray-600 dark:text-gray-400">LLM Response Time:</span>
							<span class="font-mono">{debugUpdate.llmResponseTime.toFixed(0)}ms</span>
						</div>
					{/if}
					{#if debugUpdate.totalTime !== undefined}
						<div class="flex justify-between border-t border-gray-200 pt-1 dark:border-gray-700">
							<span class="font-semibold text-gray-700 dark:text-gray-300">Total Time:</span>
							<span class="font-mono font-semibold">{debugUpdate.totalTime.toFixed(0)}ms</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- 1. Original Request -->
			{#if debugUpdate.originalRequest}
				<details
					class="rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
				>
					<summary
						class="cursor-pointer p-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
					>
						1. 원본 요청 (Original Request)
					</summary>
					<pre class="max-h-60 overflow-auto p-2 text-xs dark:bg-gray-900">{JSON.stringify(
							debugUpdate.originalRequest,
							null,
							2
						)}</pre>
				</details>
			{/if}

			<!-- 2. Input Security API Response -->
			{#if debugUpdate.inputSecurityApiResponse}
				<details
					class="rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
				>
					<summary
						class="cursor-pointer p-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
					>
						2. 원본 보안 심사 결과 (Input Security API Response)
						{#if debugUpdate.inputSecurityApiDuration !== undefined}
							<span class="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
								({debugUpdate.inputSecurityApiDuration.toFixed(0)}ms)
							</span>
						{/if}
					</summary>
					<div class="p-2 space-y-2">
						<!-- Status and Action -->
						<div class="space-y-1 text-xs">
							<div class="flex items-center gap-2">
								<span class="text-gray-600 dark:text-gray-400">Status:</span>
								<span
									class="rounded px-2 py-0.5 text-xs font-medium {debugUpdate.inputSecurityApiResponse.status === 'success'
										? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
										: debugUpdate.inputSecurityApiResponse.status === 'error' ||
												debugUpdate.inputSecurityApiResponse.status === 'timeout'
											? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
											: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}"
								>
									{debugUpdate.inputSecurityApiResponse.status}
								</span>
							</div>
							{#if debugUpdate.inputSecurityApiResponse.data?.action}
								<div class="flex items-center gap-2">
									<span class="text-gray-600 dark:text-gray-400">Action:</span>
									<span
										class="rounded px-2 py-0.5 text-xs font-medium {debugUpdate.inputSecurityApiResponse.data.action === 'NONE'
											? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
											: debugUpdate.inputSecurityApiResponse.data.action === 'BLOCKING'
												? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
												: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}"
									>
										{debugUpdate.inputSecurityApiResponse.data.action}
									</span>
								</div>
							{/if}
							{#if debugUpdate.inputSecurityApiResponse.error}
								<div class="text-red-600 dark:text-red-400">
									<span class="font-semibold">Error:</span> {debugUpdate.inputSecurityApiResponse.error}
								</div>
							{/if}
							{#if debugUpdate.inputSecurityApiResponse.reason}
								<div>
									<span class="text-gray-600 dark:text-gray-400">Reason:</span>
									<span class="ml-1">{debugUpdate.inputSecurityApiResponse.reason}</span>
								</div>
							{/if}
						</div>

						<!-- Timing Information (필수) -->
						{#if debugUpdate.inputSecurityApiResponse.timing}
							<div class="mt-2 rounded border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-900/20">
								<div class="text-xs font-semibold text-blue-700 dark:text-blue-300">Timing Information</div>
								<div class="mt-1 space-y-1 text-xs">
									{#if debugUpdate.inputSecurityApiResponse.timing.call_start !== undefined}
										<div class="flex justify-between">
											<span class="text-blue-600 dark:text-blue-400">Call Start:</span>
											<span class="font-mono">{debugUpdate.inputSecurityApiResponse.timing.call_start.toFixed(3)}s</span>
										</div>
									{/if}
									{#if debugUpdate.inputSecurityApiResponse.timing.call_end !== undefined}
										<div class="flex justify-between">
											<span class="text-blue-600 dark:text-blue-400">Call End:</span>
											<span class="font-mono">{debugUpdate.inputSecurityApiResponse.timing.call_end.toFixed(3)}s</span>
										</div>
									{/if}
									{#if debugUpdate.inputSecurityApiResponse.timing.duration !== undefined}
										<div class="flex justify-between border-t border-blue-200 pt-1 dark:border-blue-700">
											<span class="font-semibold text-blue-700 dark:text-blue-300">Duration:</span>
											<span class="font-mono font-semibold">{debugUpdate.inputSecurityApiResponse.timing.duration.toFixed(3)}s ({debugUpdate.inputSecurityApiResponse.timing.duration * 1000}ms)</span>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Security Details (AIM Guard or aprism) -->
						{#if securityDetails?.aimGuardDetails?.input}
							<details class="mt-2 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
								<summary class="cursor-pointer p-2 text-xs font-medium text-gray-700 dark:text-gray-300">
									AIM Guard Details
								</summary>
								<pre class="max-h-60 overflow-auto p-2 text-xs dark:bg-gray-800">{JSON.stringify(
										securityDetails.aimGuardDetails.input,
										null,
										2
									)}</pre>
							</details>
						{/if}
						{#if securityDetails?.aprismDetails?.input}
							<details class="mt-2 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
								<summary class="cursor-pointer p-2 text-xs font-medium text-gray-700 dark:text-gray-300">
									aprism Details
								</summary>
								<pre class="max-h-60 overflow-auto p-2 text-xs dark:bg-gray-800">{JSON.stringify(
										securityDetails.aprismDetails.input,
										null,
										2
									)}</pre>
							</details>
						{/if}

						<!-- Full Response -->
						<details class="mt-2 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
							<summary class="cursor-pointer p-2 text-xs font-medium text-gray-700 dark:text-gray-300">
								Full Response
							</summary>
							<pre class="max-h-60 overflow-auto p-2 text-xs dark:bg-gray-800">{JSON.stringify(
									debugUpdate.inputSecurityApiResponse,
									null,
									2
								)}</pre>
						</details>
					</div>
				</details>
			{/if}

			<!-- 3. LLM Request (from Security API) -->
			{#if debugUpdate.securityProxiedLlmRequest}
				<details
					class="rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
				>
					<summary
						class="cursor-pointer p-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
					>
						3. LLM 전달된 요청 (LLM Request from Security API)
					</summary>
					<div class="p-2">
						<p class="mb-2 text-xs text-gray-600 dark:text-gray-400">
							보안 검증 후 LLM에 전달된 수정된 요청입니다.
						</p>
						<pre class="max-h-60 overflow-auto text-xs dark:bg-gray-900">{JSON.stringify(
								debugUpdate.securityProxiedLlmRequest,
								null,
								2
							)}</pre>
					</div>
				</details>
			{/if}

			<!-- 4. LLM Response -->
			{#if debugUpdate.llmResponse}
				<details
					class="rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
				>
					<summary
						class="cursor-pointer p-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
					>
						4. LLM 응답 결과 (LLM Response)
					</summary>
					<pre class="max-h-60 overflow-auto p-2 text-xs dark:bg-gray-900">{JSON.stringify(
							debugUpdate.llmResponse,
							null,
							2
						)}</pre>
				</details>
			{/if}

			<!-- 5. Output Security API Response -->
			{#if debugUpdate.outputSecurityApiResponse}
				<details
					class="rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
				>
					<summary
						class="cursor-pointer p-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
					>
						5. LLM 응답 보안 심사 결과 (Output Security API Response)
						{#if debugUpdate.outputSecurityApiDuration !== undefined}
							<span class="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
								({debugUpdate.outputSecurityApiDuration.toFixed(0)}ms)
							</span>
						{/if}
					</summary>
					<div class="p-2 space-y-2">
						<!-- Status and Action -->
						<div class="space-y-1 text-xs">
							<div class="flex items-center gap-2">
								<span class="text-gray-600 dark:text-gray-400">Status:</span>
								<span
									class="rounded px-2 py-0.5 text-xs font-medium {debugUpdate.outputSecurityApiResponse.status === 'success'
										? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
										: debugUpdate.outputSecurityApiResponse.status === 'error' ||
												debugUpdate.outputSecurityApiResponse.status === 'timeout'
											? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
											: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}"
								>
									{debugUpdate.outputSecurityApiResponse.status}
								</span>
							</div>
							{#if debugUpdate.outputSecurityApiResponse.data?.action}
								<div class="flex items-center gap-2">
									<span class="text-gray-600 dark:text-gray-400">Action:</span>
									<span
										class="rounded px-2 py-0.5 text-xs font-medium {debugUpdate.outputSecurityApiResponse.data.action === 'NONE'
											? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
											: debugUpdate.outputSecurityApiResponse.data.action === 'BLOCKING'
												? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
												: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}"
									>
										{debugUpdate.outputSecurityApiResponse.data.action}
									</span>
								</div>
							{/if}
							{#if debugUpdate.outputSecurityApiResponse.error}
								<div class="text-red-600 dark:text-red-400">
									<span class="font-semibold">Error:</span> {debugUpdate.outputSecurityApiResponse.error}
								</div>
							{/if}
							{#if debugUpdate.outputSecurityApiResponse.reason}
								<div>
									<span class="text-gray-600 dark:text-gray-400">Reason:</span>
									<span class="ml-1">{debugUpdate.outputSecurityApiResponse.reason}</span>
								</div>
							{/if}
						</div>

						<!-- Timing Information (필수) -->
						{#if debugUpdate.outputSecurityApiResponse.timing}
							<div class="mt-2 rounded border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-900/20">
								<div class="text-xs font-semibold text-blue-700 dark:text-blue-300">Timing Information</div>
								<div class="mt-1 space-y-1 text-xs">
									{#if debugUpdate.outputSecurityApiResponse.timing.call_start !== undefined}
										<div class="flex justify-between">
											<span class="text-blue-600 dark:text-blue-400">Call Start:</span>
											<span class="font-mono">{debugUpdate.outputSecurityApiResponse.timing.call_start.toFixed(3)}s</span>
										</div>
									{/if}
									{#if debugUpdate.outputSecurityApiResponse.timing.call_end !== undefined}
										<div class="flex justify-between">
											<span class="text-blue-600 dark:text-blue-400">Call End:</span>
											<span class="font-mono">{debugUpdate.outputSecurityApiResponse.timing.call_end.toFixed(3)}s</span>
										</div>
									{/if}
									{#if debugUpdate.outputSecurityApiResponse.timing.duration !== undefined}
										<div class="flex justify-between border-t border-blue-200 pt-1 dark:border-blue-700">
											<span class="font-semibold text-blue-700 dark:text-blue-300">Duration:</span>
											<span class="font-mono font-semibold">{debugUpdate.outputSecurityApiResponse.timing.duration.toFixed(3)}s ({debugUpdate.outputSecurityApiResponse.timing.duration * 1000}ms)</span>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Security Details (AIM Guard or aprism) -->
						{#if securityDetails?.aimGuardDetails?.output}
							<details class="mt-2 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
								<summary class="cursor-pointer p-2 text-xs font-medium text-gray-700 dark:text-gray-300">
									AIM Guard Details
								</summary>
								<pre class="max-h-60 overflow-auto p-2 text-xs dark:bg-gray-800">{JSON.stringify(
										securityDetails.aimGuardDetails.output,
										null,
										2
									)}</pre>
							</details>
						{/if}
						{#if securityDetails?.aprismDetails?.output}
							<details class="mt-2 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
								<summary class="cursor-pointer p-2 text-xs font-medium text-gray-700 dark:text-gray-300">
									aprism Details
								</summary>
								<pre class="max-h-60 overflow-auto p-2 text-xs dark:bg-gray-800">{JSON.stringify(
										securityDetails.aprismDetails.output,
										null,
										2
									)}</pre>
							</details>
						{/if}

						<!-- Full Response -->
						<details class="mt-2 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
							<summary class="cursor-pointer p-2 text-xs font-medium text-gray-700 dark:text-gray-300">
								Full Response
							</summary>
							<pre class="max-h-60 overflow-auto p-2 text-xs dark:bg-gray-800">{JSON.stringify(
									debugUpdate.outputSecurityApiResponse,
									null,
									2
								)}</pre>
						</details>
					</div>
				</details>
			{/if}

			<!-- 6. Final Response -->
			{#if debugUpdate.finalResponse}
				<details
					class="rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
				>
					<summary
						class="cursor-pointer p-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
					>
						6. 최종 반환 결과 (Final Response)
					</summary>
					<div class="p-2">
						<pre class="max-h-60 overflow-auto whitespace-pre-wrap text-xs dark:bg-gray-900">{debugUpdate.finalResponse}</pre>
					</div>
				</details>
			{/if}

			<!-- Legacy: Security Response (for backward compatibility) -->
			{#if debugUpdate.securityResponse && !debugUpdate.inputSecurityApiResponse}
				<details
					class="rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
				>
					<summary
						class="cursor-pointer p-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
					>
						보안 응답 (Security Response)
						{#if debugUpdate.isDummyResponse}
							<span
								class="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
							>
								더미 응답
							</span>
						{/if}
					</summary>
					<div class="p-2 space-y-1 text-xs">
						<div class="flex items-center gap-2">
							<span class="text-gray-600 dark:text-gray-400">Action:</span>
							<span
								class="rounded px-2 py-0.5 text-xs font-medium {debugUpdate.securityResponse
									.action === 'allow'
									? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
									: debugUpdate.securityResponse.action === 'block'
										? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
										: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}"
							>
								{debugUpdate.securityResponse.action}
							</span>
						</div>
						{#if debugUpdate.securityResponse.reason}
							<div>
								<span class="text-gray-600 dark:text-gray-400">Reason:</span>
								<span class="ml-1">{debugUpdate.securityResponse.reason}</span>
							</div>
						{/if}
						{#if debugUpdate.securityResponse.modifiedKwargs}
							<details class="mt-2 rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
								<summary class="cursor-pointer p-2 text-xs font-medium text-gray-700 dark:text-gray-300">
									Full Response
								</summary>
								<pre class="max-h-60 overflow-auto p-2 text-xs dark:bg-gray-800">{JSON.stringify(
										debugUpdate.securityResponse.modifiedKwargs,
										null,
										2
									)}</pre>
							</details>
						{/if}
					</div>
				</details>
			{/if}

			<!-- Legacy: Final LLM Response (for backward compatibility) -->
			{#if debugUpdate.finalLlmResponse && !debugUpdate.llmResponse}
				<details
					class="rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
				>
					<summary
						class="cursor-pointer p-2 text-xs font-semibold text-gray-700 dark:text-gray-300"
					>
						최종 응답 (Final LLM Response)
					</summary>
					<pre class="max-h-60 overflow-auto p-2 text-xs dark:bg-gray-900">{JSON.stringify(
							debugUpdate.finalLlmResponse,
							null,
							2
						)}</pre>
				</details>
			{/if}

			<!-- Error -->
			{#if debugUpdate.error}
				<div
					class="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
				>
					<span class="font-semibold">Error:</span>
					{debugUpdate.error}
				</div>
			{/if}
		</div>
	{/if}
</div>
