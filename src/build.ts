import { join } from 'path';
import yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { isString } from 'lodash-es';
import {
	build as esbuild,
	BuildOptions as EsBuildOptions,
} from 'esbuild';
import { green, red } from 'chalk';
import { testFileDep } from './dependency';
import { TaskNode, TaskOutput, BuildGraph } from './buildGraph';
import type { ConfigOptions } from './configProject';

export interface BuildOptions {
	buildDir: string,
  task:string,
}

interface RebuildEntry {
  rebuildPath: string,
  dep: string,
}

export async function build(options: BuildOptions) {
	const { buildDir, task: taskName } = options;
	const ymlPath = join(buildDir, 'yesbuild.yml');
	if (!fs.existsSync(ymlPath)) {
		throw new Error(`yesbuild.yml not found in ${ymlPath}`);
	}

	const content = await fs.promises.readFile(ymlPath, 'utf-8');
	const objs: any = yaml.load(content);
	const graph = BuildGraph.fromJSON(objs);

  if (taskName === '*') {
    await runAllTaks(graph, buildDir, ymlPath);
  } else {
    const task = graph.tasks.get(taskName);
    if (!task) {
      console.log(`Task ${red(taskName)} not found!`);
      process.exit(1);
    }
    await runTask(graph, buildDir, task, taskName, ymlPath);
  }
}

async function runAllTaks(graph: BuildGraph, buildDir: string, ymlPath: string) {
  for (const [name, task] of graph.tasks) {
    await runTask(graph, buildDir, task, name, ymlPath);
  }
}

async function runTask(graph: BuildGraph, buildDir: string, task: TaskNode, taskName: string, ymlPath: string) {
  console.log(`Running task: ${green(taskName)}`);
  const entries: RebuildEntry[] = [];
  let forceRebuild = false;
  try {
    checkDependenciesUpdate(task, entries);
  } catch (err) {
    console.info('Error occurs, force rebuild');
    forceRebuild = true;
  }

  if (entries.length > 0 || forceRebuild) {
    const configOptions = graph.staticPools['configOptions'];
    await rebuild(configOptions, buildDir, entries, ymlPath);
  } else {
    console.log('Everything is update to date.');
  }
}

function checkDependenciesUpdate(task: TaskNode, rebuildEntries: RebuildEntry[]) {
  // TODO: check deps
  for (const key in task.outputs) {
    const value: TaskOutput = task.outputs[key];
    checkDependencyOfOutput(key, value, rebuildEntries);
  }
}

function checkDependencyOfOutput(path: string, output: TaskOutput, rebuildEntries: RebuildEntry[]) {
  const statOfNode = fs.statSync(path);
  const { mtimeMs: targetMtime } = statOfNode;

  for (const depLiteral of output.deps) {
    let testResult = testFileDep(depLiteral);
    if (isString(testResult)) {
      const stat = fs.statSync(testResult);
      const { mtimeMs } = stat;
      if (mtimeMs > targetMtime) {
        const entry: RebuildEntry = {
          rebuildPath: path,
          dep: testResult,
        };
        rebuildEntries.push(entry);
      }
    } else {
      throw new Error(`Get a new type of depencency: ${depLiteral}, not support yet`);
    }
  }
}

async function rebuild(configOptions: ConfigOptions, buildDir: string, rebuildEntries: RebuildEntry[], ymlPath: string) {
  for (const entry of rebuildEntries) {
    const { rebuildPath, dep } = entry;
    console.log(`rebuild ${rebuildPath} -> ${dep}`);
  }

  const { entry, platform } = configOptions;

  const outdir = path.join(buildDir, 'files');

	const esBuildOptions: EsBuildOptions = {
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		logLevel: 'error',
		splitting: true,
		outdir,
		sourcemap: true,
		platform: platform as any,
		metafile: true,
		plugins: []
	};

	await esbuild(esBuildOptions);
}
