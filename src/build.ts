import { join, resolve } from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { green, red } from 'chalk';
import { performance } from 'perf_hooks';
import { config, ConfigOptions } from './configProject';
import { TaskNode, BuildGraph } from './buildGraph';
import { getAction, ExecuteContext } from './actions';

let taskCounter = 0;

export interface BuildOptions {
	buildDir: string,
  task: string,
  conclusion?: boolean,
	forceUpdate?: boolean,
}

export async function build(options: BuildOptions) {
  const beginTime = performance.now();
	const { buildDir, task: taskName, conclusion, forceUpdate } = options;
	const ymlPath = join(buildDir, 'yesbuild.yml');
	if (!fs.existsSync(ymlPath)) {
		throw new Error(`yesbuild.yml not found in ${ymlPath}`);
	}

	const content = await fs.promises.readFile(ymlPath, 'utf-8');
	const objs: any = yaml.load(content);
	const graph = BuildGraph.fromJSON(objs);

  if (graph.needsReconfig(ymlPath)) {
    console.log(`Dependencies of ${green(ymlPath)} changed, reconfig...`);
    const configOptions: ConfigOptions = {
      buildDir: resolve(buildDir, '..'),
    };
    await config(configOptions);
  }

	const taskOptions: RunTaskOptions = {
		forceUpdate: Boolean(forceUpdate),
		ymlPath,
		workDir: buildDir,
	}

  if (taskName === '*') {
    await runAllTasks(graph, taskOptions);
  } else {
    const tasksToRun = graph.checkDependenciesUpdated(taskName, forceUpdate);
    if (tasksToRun.length === 0) {
      console.log();
      console.log('\ud83c\udf1e Everything is up to date.');
      console.log();
      return;
    }

		console.log('tasks to rebuild: ', JSON.stringify(tasksToRun));
    for (const taskName of tasksToRun) {
      const task = graph.tasks.get(taskName);
      if (!task) {
        console.log(`Task ${red(taskName)} not found!`);
        process.exit(1);
      }
      await runTask(task, taskName, taskOptions);
    }
  }

  const endTime = performance.now();
  if (taskCounter > 0 && conclusion) {
    console.log();
    console.log(`Totally ${taskCounter} tasks in ${Math.round(endTime - beginTime)}ms.`);
  }
}

export interface RunTaskOptions {
	forceUpdate?: boolean;
	ymlPath: string;
	workDir: string;
}

export async function runAllTasks(graph: BuildGraph, options: RunTaskOptions) {
  const { forceUpdate } = options;
  const orderedTasks: string[] = graph.checkDependenciesUpdated('*', forceUpdate);
  for (const taskName of orderedTasks) {
    const task = graph.tasks.get(taskName);
    await runTask(task, taskName, options);
  }
}

async function runTask(task: TaskNode, taskName: string, options: RunTaskOptions) {
  taskCounter++;
  console.log(`Running task: ${green(taskName)}`);
  let updatedEntries: string[] | undefined;

	const { workDir: buildDir, forceUpdate } = options;

  await rebuild(taskName, task, buildDir, Boolean(forceUpdate), updatedEntries);
}

async function rebuild(taskName: string, taskNode: TaskNode, buildDir: string, forceUpdate: boolean, updatedEntries?: string[]) {
	if (updatedEntries && updatedEntries.length > 0) {
		console.log(`Rebuild action ${green(taskName)} because of these dependencies changed:`)
		for (const entry of updatedEntries) {
			console.log(`  - ${entry}`);
		}
	}

	const executeContext: ExecuteContext = Object.freeze({
		workDir: buildDir,
		updatedDeps: updatedEntries,
    forceUpdate,
	});

	for (const rawAction of taskNode.actions) {
		const { name, params } = rawAction;
		const actionCtor = getAction(name);
		if (!actionCtor) {
			console.log(`Unreconized action ${red(name)}, can not rebuild.`);
			process.exit(1);
		}

		const action = new actionCtor(params);
		await action.execute(executeContext);

		const outputs = action.getOutputs();
		const deps = action.getDeps();
		taskNode.deps = deps;
		taskNode.outputs = outputs;
	}
}
