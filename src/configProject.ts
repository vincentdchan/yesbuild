import { join } from 'path';
import { Profile, DebugProfile, ReleaseProfile } from './profile';

export interface ConfigOptions {
	entry: string,
	buildDir: string,
	platform: string,
}

function initializeProfiles(buildDir: string): Profile[] {
	const result: Profile[] = [];

	const debugDir = join(buildDir, 'debug');
	result.push(new DebugProfile(debugDir));

	const releaseDir = join(buildDir, 'release');
	result.push(new ReleaseProfile(releaseDir));

	return result;
}

export async function config(options: ConfigOptions) {
	const { buildDir } = options;
	const profiles = initializeProfiles(buildDir);
	// @todo(Vincent Chan): maybe can be parallized?
	for (const profile of profiles) {
		await profile.doConfig(options);
	}
}
