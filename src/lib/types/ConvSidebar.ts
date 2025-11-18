import type { ObjectId } from "bson";

export interface ConvSidebar {
	id: ObjectId | string;
	title: string;
	updatedAt: Date;
	createdAt: Date;
	model?: string;
	securityExternalApi?: "AIM" | "APRISM" | "NONE";
	avatarUrl?: string | Promise<string | undefined>;
}
