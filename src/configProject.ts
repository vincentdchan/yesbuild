import { basename } from 'path';
import { BuildScriptContext, loadBuildScript } from './buildScript';
import { BuildGraph } from './buildGraph';
import { runAllTasks, RunTaskOptions } from './build';
import { gray } from 'chalk';
import logger from './logger';

export interface ConfigOptions {
	buildDir: string,
}

export async function config(options: ConfigOptions) {
	const scriptContext = await loadBuildScript();
	const graph = new BuildGraph(scriptContext.deps);
	await __configure(graph, scriptContext, options);
}

async function __configure(graph: BuildGraph, scriptContext: BuildScriptContext, options: ConfigOptions): Promise<void> {
	const { path: scriptPath, registry } = scriptContext;
	const scriptFilename = basename(scriptPath);
	logger.printIfReadable(`\ud83d\udd28 Geneating project for ${gray(scriptFilename)} ...`);
	const { buildDir } = options;

	registry.executeTaskToCollectDeps(graph, buildDir);
	await runAllTasks(graph, buildDir, false);
	await graph.dumpFiles(buildDir);
}
