import type { MessageFile } from "$lib/types/Message";
import { getStoredFile } from "./storage";

export async function downloadFile(
	hash: string,
	conversationId: string
): Promise<MessageFile & { type: "base64" }> {
	const stored = getStoredFile(conversationId, hash);

	if (!stored) {
		throw new Error("File not found");
	}

	return {
		type: "base64",
		name: stored.name,
		value: stored.base64,
		mime: stored.mime,
	};
}
