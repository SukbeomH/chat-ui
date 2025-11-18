import { MessageUpdateType, type MessageUpdate } from "$lib/types/MessageUpdate";
import type { Conversation } from "$lib/types/Conversation";

export async function* generateTitleForConversation(
	conv: Conversation,
	_locals: App.Locals | undefined
): AsyncGenerator<MessageUpdate, undefined, undefined> {
	// 제목 생성 조건: title이 없거나 "New Chat"인 경우
	const shouldGenerateTitle = !conv.title || conv.title.trim() === "" || conv.title === "New Chat";

	// 첫 사용자 메시지 찾기 (시스템 메시지 제외)
	const userMessage = conv.messages.find((m) => m.from === "user");

	if (!shouldGenerateTitle || !userMessage || !userMessage.content?.trim()) {
		return;
	}

	const prompt = userMessage.content.trim();
	if (!prompt) {
		return;
	}

	const title = generateTitle(prompt) ?? "New Chat";

	yield {
		type: MessageUpdateType.Title,
		title,
	};
}

function generateTitle(prompt: string): string | null {
	if (!prompt || !prompt.trim()) {
		return null;
	}

	const words = prompt.trim().split(/\s+/g);
	if (words.length === 0) {
		return null;
	}

	// Always use the first five words for title generation
	return words.slice(0, 5).join(" ") || null;
}

// No post-processing: rely solely on prompt instructions above
