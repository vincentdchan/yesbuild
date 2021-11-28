// This script help loading build script from user

import * as fs from 'fs';
import * as path from 'path';
import {
	build as esbuild,
	BuildOptions as EsBuildOptions,
	BuildResult as EsBuildResult,
} from 'esbuild';
import { DependencyBuilder, Dependencies } from './dependency';
import { isUndefined } from 'lodash-es';
import registry, { RegistryContext } from './registry';
import logger  from './logger';

function findProjectPath(): string | undefined {
	let currentDir = process.cwd();
	let packageJsonPath = path.join(currentDir, 'package.json');

	while (!fs.existsSync(packageJsonPath)) {
		const tmp = path.resolve(currentDir, '..');
		if (tmp === currentDir) {  // it's the end
			return undefined;
		}
		packageJsonPath = path.join(currentDir, 'package.json');
	}

	return currentDir;
}

function findBuildScriptPath(): string | undefined {
	const projectPath = findProjectPath();
	if (isUndefined(projectPath)) {
		return undefined;
	}

	let expectedFilename: string;
	expectedFilename = path.join(projectPath, 'yesbuild.config.js');
	if (fs.existsSync(expectedFilename)) {
		return expectedFilename;
	}

	expectedFilename = path.join(projectPath, 'yesbuild.config.mjs');
	if (fs.existsSync(expectedFilename)) {
		return expectedFilename;
	}

	expectedFilename = path.join(projectPath, 'yesbuild.config.ts');
	if (fs.existsSync(expectedFilename)) {
		return expectedFilename;
	}

	return undefined;
}

async function bundleBuildScript(entry: string, depBuilder?: DependencyBuilder): Promise<string> {
	const outfile = entry + '.js';
	const collectDeps = !isUndefined(depBuilder);
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
		collectDependenciesByBuildResult(buildResult, depBuilder!);
	}
	return outfile;
}

function collectDependenciesByBuildResult(result: EsBuildResult, depBuilder: DependencyBuilder) {
	if (isUndefined(result.metafile)) {
		return;
	}
	const { outputs } = result.metafile;
	for (const key in outputs) {
		const output = outputs[key];
		for (const dep of Object.keys(output.inputs)) {
			depBuilder.dependFile(dep);
		}
	}
}

export interface BuildScriptContext {
	path: string;
	registry: RegistryContext;
	deps: Dependencies;
}

export function loadBuildScript(): Promise<BuildScriptContext> {
	const buildScriptPath = findBuildScriptPath();
	if (isUndefined(buildScriptPath)) {
		logger.printIfReadable('No build script found.');
		return;
	}

	return loadScriptAsProfile(buildScriptPath);
}

async function loadScriptAsProfile(path: string): Promise<BuildScriptContext> {
	const depBuilder: DependencyBuilder = new DependencyBuilder();
	const scriptPath = await bundleBuildScript(path, depBuilder);
	require(scriptPath);
	fs.unlinkSync(scriptPath);
	const registryContext = registry.takeContext();
	// return new Profile(path, registryContext, depBuilder.finalize());
	return {
		path,
		registry: registryContext,
		deps: depBuilder.finalize(),
	};
}
