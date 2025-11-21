/* eslint-disable no-undef */
/* global File, Buffer */
import type { MessageFile } from "$lib/types/Message";
import { createHash } from "node:crypto";
import { storeFile } from "./storage";

export async function uploadFile(file: File, conversationId: string): Promise<MessageFile> {
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	const sha = createHash("sha256").update(buffer).digest("hex");

	return storeFile(conversationId, sha, buffer, file.name, file.type);
}
