import { join, resolve } from 'path';
import * as fs from 'fs';
import { green, red, cyan, grey } from 'chalk';
import { isArray } from 'lodash-es';
import { config, ConfigOptions } from './configProject';
import { Deps, DependenciesChangedCell } from './dependency';
import { TaskNode, BuildGraph, makeTaskYmlFilename } from './buildGraph';
import { getAction, ExecutionContext } from './actions';
import logger from './logger';

export interface BuildOptions {
  buildDir: string,
  task: string,
  forceUpdate?: boolean,
	ignoreMeta?: boolean,
}

export async function build(options: BuildOptions) {
  const { buildDir, task: taskName, forceUpdate } = options;
  const ymlPath = makeTaskYmlFilename(buildDir, taskName);
  if (!fs.existsSync(ymlPath)) {
    logger.panic(`Error: ${cyan(ymlPath)} not exists, task ${green(taskName)} can not build.
Is the directory ${grey(resolve(buildDir))} correct?`);
		return;
  }

  const graph = await BuildGraph.loadPartialFromYml(ymlPath);

	let changedDepOfMeta: string | undefined = undefined
	if (!options.ignoreMeta && (changedDepOfMeta = graph.needsReconfig(buildDir))) {
		logger.printIfReadable(`${cyan(changedDepOfMeta)} changed, reconfig...`);
		const configOptions: ConfigOptions = {
			buildDir,
		};
		await config(configOptions);

		logger.printIfReadable(`Finished, continue to build...`);
		logger.printIfReadable();
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
    await runAllTasks(graph, buildDir, taskOptions.forceUpdate, dependenciesChangedCell);
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
      await runTask(task, taskName, taskOptions, dependenciesChangedCell);
    }
  }

	if (dependenciesChangedCell.changed) {
		await graph.dumpFiles(buildDir);
		logger.addUpdatedYml(ymlPath);
	}
}

export interface RunTaskOptions {
  forceUpdate?: boolean;
  ymlPath: string;
  workDir: string;
}

export async function runAllTasks(graph: BuildGraph, buildDir: string, forceUpdate: boolean, changedCell?: DependenciesChangedCell) {
  const orderedTasks: string[] = graph.checkDependenciesUpdated('*', forceUpdate);
  for (const taskName of orderedTasks) {
    const task = graph.tasks.get(taskName);
		const ymlPath = makeTaskYmlFilename(buildDir, taskName);
		const options: RunTaskOptions = {
			forceUpdate,
			ymlPath,
			workDir: buildDir,
		};
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
	buildDir = resolve(buildDir);
  for (const rawAction of taskNode.actions) {
    const { name, params } = rawAction;
    const actionCtor = getAction(name);
    if (!actionCtor) {
      logger.panic(`Unreconized action ${red(name)}, can not rebuild task ${taskName}.`);
      return;
    }

    const action = new actionCtor(params);

		const executeContext: ExecutionContext = {
			buildDir,
			taskDir: join(buildDir, name),
			forceUpdate,
		};

    await action.execute(executeContext);

    const outputs = action.getOutputs();
    const newDeps = action.dependencyBuilder.finalize();
		const { deps: previousDeps } = taskNode;
		if (!Deps.equals(previousDeps, newDeps)) {
			taskNode.deps = newDeps;
			if (changedCell) {
				changedCell.changed = true;
			}
		}
    taskNode.outputs = outputs.map(output => output.file);

    if (isArray(outputs)) {
      for (const o of outputs) {
        logger.addOutput(o);
      }
    }
  }
}
