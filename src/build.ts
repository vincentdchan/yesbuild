import { join, resolve } from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { green, red } from 'chalk';
import { isArray } from 'lodash-es';
import { config, ConfigOptions } from './configProject';
import { mergeDependencies, DependenciesChangedCell } from './dependency';
import { TaskNode, BuildGraph } from './buildGraph';
import { getAction, ExecuteContext } from './actions';
import logger from './logger';

export interface BuildOptions {
  buildDir: string,
  task: string,
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

	// needs to know if dependencies changed
	// re-write the yml files if changed
	const dependenciesChangedCell: DependenciesChangedCell = {
		changed: false,
	};
  if (taskName === '*') {
    await runAllTasks(graph, taskOptions);
  } else {
    const tasksToRun = graph.checkDependenciesUpdated(taskName, forceUpdate);
    if (tasksToRun.length === 0) {
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

	// Important to know:
	// If the dependencies of a child task changed.
	// It's not safe for a child-process to write the yml file itself.
	if (dependenciesChangedCell.changed) {
		logger.printIfReadable('Dependencies changed');
	}
}

export interface RunTaskOptions {
  forceUpdate?: boolean;
  ymlPath: string;
  workDir: string;
}

export async function runAllTasks(graph: BuildGraph, options: RunTaskOptions, changedCell?: DependenciesChangedCell) {
  const { forceUpdate } = options;
  const orderedTasks: string[] = graph.checkDependenciesUpdated('*', forceUpdate);
  for (const taskName of orderedTasks) {
    const task = graph.tasks.get(taskName);
    await runTask(task, taskName, options, changedCell);
  }
}

async function runTask(task: TaskNode, taskName: string, options: RunTaskOptions, changedCell?: DependenciesChangedCell) {
  logger.plusTaskCounter();
  logger.printIfReadable(`Running task: ${green(taskName)}`);

  const { workDir: buildDir, forceUpdate } = options;

  await rebuild(taskName, task, buildDir, Boolean(forceUpdate), changedCell);
}

async function rebuild(taskName: string, taskNode: TaskNode, buildDir: string, forceUpdate: boolean, changedCell?: DependenciesChangedCell) {
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
    const newDeps = action.dependencyBuilder.finalize();
		const { deps: previousDeps } = taskNode;
    taskNode.deps = mergeDependencies(previousDeps, newDeps, changedCell);
    taskNode.outputs = outputs;

    if (isArray(outputs)) {
      for (const o of outputs) {
        logger.addOutput({
          file: o,
          size: 0,
        });
      }
    }
  }
}
