/* eslint-disable no-undef */
/* global Buffer */
import type { Message } from "$lib/types/Message";
import type { EndpointMessage } from "./endpoints";
import { downloadFile } from "../files/downloadFile";
import { logger } from "../logger";
export async function preprocessMessages(
	messages: Message[],
	convId: string
): Promise<EndpointMessage[]> {
	logger.debug(
		{
			conversationId: convId,
			messageCount: messages.length,
		},
		"Preprocessing messages before OpenAI request"
	);

	return Promise.resolve(messages)
		.then((msgs) => downloadFiles(msgs, convId))
		.then((msgs) => {
			logger.debug(
				{
					conversationId: convId,
					messageCount: msgs.length,
					fileSummary: msgs.map((m) => ({
						from: m.from,
						fileCount: m.files?.length ?? 0,
						mimes: m.files?.map((f) => f.mime).slice(0, 5) ?? [],
					})),
				},
				"Downloaded conversation files for OpenAI request"
			);
			return injectClipboardFiles(msgs);
		});
}

async function downloadFiles(messages: Message[], convId: string): Promise<EndpointMessage[]> {
	return Promise.all(
		messages.map<Promise<EndpointMessage>>((message) =>
			Promise.all(
				(message.files ?? []).map((file) => {
					// 이미 base64 데이터가 들어있는 경우 그대로 사용하고,
					// 해시인 경우에만 서버 저장소에서 조회해 base64로 변환합니다.
					if (file.type === "base64") {
						return Promise.resolve(file);
					}

					return downloadFile(file.value, convId);
				})
			).then((files) => ({ ...message, files }))
		)
	);
}

async function injectClipboardFiles(messages: EndpointMessage[]) {
	return Promise.all(
		messages.map((message) => {
			const plaintextFiles = message.files
				?.filter((file) => file.mime === "application/vnd.chatui.clipboard")
				.map((file) => Buffer.from(file.value, "base64").toString("utf-8"));

			if (!plaintextFiles || plaintextFiles.length === 0) {
				return message;
			}

			return {
				...message,
				content: `${plaintextFiles.join("\n\n")}\n\n${message.content}`,
				files: message.files?.filter((file) => file.mime !== "application/vnd.chatui.clipboard"),
			};
		})
	);
}
