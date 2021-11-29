import { basename } from 'path';
import { BuildScriptContext, loadBuildScript } from './buildScript';
import { BuildGraph } from './buildGraph';
import { runAllTasks } from './build';
import { gray } from 'chalk';
import * as fs from 'fs';
import logger from './logger';

export interface ConfigOptions {
  buildDir: string,
}

async function __configure(graph: BuildGraph, scriptContext: BuildScriptContext, options: ConfigOptions): Promise<void> {
  const { path: scriptPath, registry } = scriptContext;
  const scriptFilename = basename(scriptPath);
  logger.printIfReadable(`\ud83d\udd28 Geneating project for ${gray(scriptFilename)} ...`);
  const { buildDir } = options;

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  registry.executeTaskToCollectDeps(graph, buildDir);
  await runAllTasks(graph, buildDir, false);
  await graph.dumpFiles(buildDir);
}

export default async function configure(options: ConfigOptions) {
  const scriptContext = await loadBuildScript();
  const graph = new BuildGraph(scriptContext.deps);
  await __configure(graph, scriptContext, options);
}
