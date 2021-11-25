import { scanProject } from './scan';
import { join } from 'path';
import { Profile, DebugProfile, ReleaseProfile } from './profile';

export interface ConfigOptions {
	entry: string,
	buildDir: string,
	platform: string,
}

function initializeBuildDir(buildDir: string): Profile[] {
	const result: Profile[] = [];

	const debugDir = join(buildDir, 'debug');
	result.push(new DebugProfile(debugDir));

	const releaseDir = join(buildDir, 'release');
	result.push(new ReleaseProfile(releaseDir));

	return result;
}

export function config(options: ConfigOptions) {
	const { entry, platform, buildDir } = options;
	initializeBuildDir(buildDir);
	scanProject(entry, platform);
}
