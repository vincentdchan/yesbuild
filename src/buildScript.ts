// This script help loading build script from user

import * as fs from 'fs';
import * as path from 'path';
import {
	build as esbuild,
	BuildOptions as EsBuildOptions,
	BuildResult as EsBuildResult,
} from 'esbuild';
import { makeFileDep } from './dependency';
import { Profile } from './profile';
import { isUndefined } from 'lodash-es';
import registry from './registry';
import logger  from './logger';

function findProjectPath(): string | null {
	let currentDir = process.cwd();
	let packageJsonPath = path.join(currentDir, 'package.json');

	while (!fs.existsSync(packageJsonPath)) {
		const tmp = path.resolve(currentDir, '..');
		if (tmp === currentDir) {  // it's the end
			return null;
		}
		packageJsonPath = path.join(currentDir, 'package.json');
	}

	return currentDir;
}

function findBuildScriptPath(): { name: string, path: string }[] {
	const projectPath = findProjectPath();
	if (projectPath === null) {
		return null;
	}

	const result = [];
	const files = fs.readdirSync(projectPath);

	for (const file of files) {
		const testResult = /yesbuild.(.+).(js|ts|mjs)/.exec(file);
		if (testResult) {
			let name = testResult[1];
			if (isUndefined(name)) {
				throw new Error(`name is undefined for path: ${file}`);
			}
			name = name.replace(/(\.|\\|\/)/g, '_');  // escape the special chars
			const fullPath = path.join(projectPath, file);
			result.push({
				name,
				path: fullPath,
			});
		}
	}

	return result;
}

async function bundleBuildScript(entry: string, deps?: Set<string>): Promise<string> {
	const outfile = entry + '.js';
	const collectDeps = !isUndefined(deps);
	const esBuildOptions: EsBuildOptions = {
		entryPoints: [entry],
		bundle: true,
		format: 'cjs',
		outfile,
		logLevel: 'error',
		splitting: false,
		sourcemap: 'inline',
		platform: 'node',
		metafile: true,
		plugins: [],
		external: ['esbuild', 'yesbuild', './dist'],
	};

	const buildResult = await esbuild(esBuildOptions);
	if (collectDeps) {
		collectDependenciesByBuildResult(buildResult, deps!);
	}
	return outfile;
}

function collectDependenciesByBuildResult(result: EsBuildResult, deps: Set<string>) {
	if (isUndefined(result.metafile)) {
		return;
	}
	const { outputs } = result.metafile;
	for (const key in outputs) {
		const output = outputs[key];
		for (const dep of Object.keys(output.inputs)) {
			deps.add(makeFileDep(dep));
		}
	}
}

export async function loadBuildScript(): Promise<Profile[]> {
	const buildScriptPath = findBuildScriptPath();
	if (buildScriptPath.length === 0) {
		logger.printIfReadable('No build script found.');
		return;
	}

	const result: Profile[] = [];
	for (const { name, path } of buildScriptPath) {
		const profile = await loadScriptAsProfile(name, path);
		result.push(profile);
	}

	return result;
}

async function loadScriptAsProfile(name: string, path: string): Promise<Profile> {
	const deps: Set<string> = new Set();
	const scriptPath = await bundleBuildScript(path, deps);
	require(scriptPath);
	fs.unlinkSync(scriptPath);
	const registryContext = registry.takeContext();
	return new Profile(name, path, registryContext, [...deps]);
}
