import { join, resolve } from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { green, red } from 'chalk';
import { config, ConfigOptions } from './configProject';
import { TaskNode, BuildGraph } from './buildGraph';
import { getAction, ExecuteContext } from './actions';
import logger from './logger';

export interface BuildOptions {
	buildDir: string,
  task: string,
  conclusion?: boolean,
	forceUpdate?: boolean,
}

export async function build(options: BuildOptions) {
	const { buildDir, task: taskName, forceUpdate } = options;
	const ymlPath = join(buildDir, 'yesbuild.yml');
	if (!fs.existsSync(ymlPath)) {
		throw new Error(`yesbuild.yml not found in ${ymlPath}`);
	}

	const content = await fs.promises.readFile(ymlPath, 'utf-8');
	const objs: any = yaml.load(content);
	const graph = BuildGraph.fromJSON(objs);

  if (graph.needsReconfig(ymlPath)) {
    logger.printIfReadable(`Dependencies of ${green(ymlPath)} changed, reconfig...`);
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
			logger.printAndExit();
      return;
    }

    for (const taskName of tasksToRun) {
      const task = graph.tasks.get(taskName);
      if (!task) {
        logger.panic(`Task ${red(taskName)} not found!`);
				return;
      }
      await runTask(task, taskName, taskOptions);
    }
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
	logger.plusTaskCounter();
  logger.printIfReadable(`Running task: ${green(taskName)}`);

	const { workDir: buildDir, forceUpdate } = options;

  await rebuild(taskName, task, buildDir, Boolean(forceUpdate));
}

async function rebuild(taskName: string, taskNode: TaskNode, buildDir: string, forceUpdate: boolean) {
	const executeContext: ExecuteContext = Object.freeze({
		workDir: buildDir,
    forceUpdate,
	});

	for (const rawAction of taskNode.actions) {
		const { name, params } = rawAction;
		const actionCtor = getAction(name);
		if (!actionCtor) {
			logger.panic(`Unreconized action ${red(name)}, can not rebuild.`);
			return;
		}

		const action = new actionCtor(params);
		await action.execute(executeContext);

		const outputs = action.getOutputs();
		const deps = action.getDeps();
		taskNode.deps = deps;
		taskNode.outputs = outputs;
	}
}
