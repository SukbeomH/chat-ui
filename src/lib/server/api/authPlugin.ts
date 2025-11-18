import Elysia from "elysia";
import { authenticateRequest } from "../auth";
import type { Cookie } from "elysia";

export const authPlugin = new Elysia({ name: "auth" }).derive(
	{ as: "scoped" },
	async ({
		headers,
		cookie,
	}): Promise<{
		locals: App.Locals;
	}> => {
		// Convert Elysia cookie type to expected format
		const cookieRecord: Record<string, Cookie<string | undefined>> = {};
		for (const [key, value] of Object.entries(cookie)) {
			cookieRecord[key] = value as Cookie<string | undefined>;
		}

		const auth = await authenticateRequest(
			{ type: "elysia", value: headers },
			{ type: "elysia", value: cookieRecord }
		);
		return {
			locals: {
				user: auth?.user,
				sessionId: auth?.sessionId,
				isAdmin: auth?.isAdmin,
			},
		};
	}
);
