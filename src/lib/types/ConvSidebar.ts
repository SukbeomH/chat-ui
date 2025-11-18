export interface ConvSidebar {
	id: string;
	title: string;
	updatedAt: Date;
	createdAt: Date;
	model?: string;
	securityExternalApi?: "AIM" | "APRISM" | "NONE";
	avatarUrl?: string | Promise<string | undefined>;
}
