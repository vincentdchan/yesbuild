import { loadBuildScript } from './buildScript';

export interface ConfigOptions {
	entry: string,
	buildDir: string,
	platform: string,
}

export async function config(options: ConfigOptions) {
	const profiles = await loadBuildScript();

	// @todo(Vincent Chan): maybe can be parallized?
	for (const profile of profiles) {
		await profile.doConfig(options);
	}
}
