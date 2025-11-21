/* eslint-disable no-undef */
/* global Buffer */
import type { MessageFile } from "$lib/types/Message";

type StoredFile = {
	data: Buffer;
	mime: string;
	name: string;
};

const fileStore = new Map<string, StoredFile>();

function makeKey(conversationId: string, hash: string): string {
	return `${conversationId}:${hash}`;
}

export function storeFile(
	conversationId: string,
	hash: string,
	data: Buffer,
	name: string,
	mime: string
): MessageFile {
	const key = makeKey(conversationId, hash);
	fileStore.set(key, { data, mime, name });

	return {
		type: "hash",
		name,
		value: hash,
		mime,
	};
}

export function getStoredFile(
	conversationId: string,
	hash: string
): (StoredFile & { base64: string }) | null {
	const key = makeKey(conversationId, hash);
	const stored = fileStore.get(key);

	if (!stored) {
		return null;
	}

	return {
		...stored,
		base64: stored.data.toString("base64"),
	};
}
