import { base } from "$app/paths";
import { redirect } from "@sveltejs/kit";

export async function load({ params, parent }) {
	const data = await parent();

	const model = data.models.find((m: { id: string }) => m.id === params.model);

	if (!model || model.unlisted) {
		redirect(302, `${base}/models`);
	}

	return {
		settings: {
			...(data.settings || {}),
			activeModel: params.model,
		},
	};
}
