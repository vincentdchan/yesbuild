import { join, resolve } from 'path';
import * as fs from 'fs';
import { green, red, cyan, grey } from 'chalk';
import { isUndefined } from 'lodash-es';
import configure, { ConfigOptions } from './configure';
import { Deps, DependenciesChangedCell, DependencyBuilder } from './dependency';
import { TaskNode, BuildGraph, makeTaskYmlFilename, ActionStore } from './buildGraph';
import { getAction, ExecutionContext } from './actions';
import { FLAGS_STAGE_MASK, FLAGS_FORCE_UPDATE, FLAGS_IGNORE_META } from './flags';
import { OutputLog, Outputs, OutputBuilder } from './output';
import logger from './logger';

export interface BuildOptions {
  buildDir: string,
  task: string,
  flags: number,
}

export async function build(options: BuildOptions) {
  const { buildDir, task: taskName, flags } = options;
  const ymlPath = makeTaskYmlFilename(buildDir, taskName);
  if (!fs.existsSync(ymlPath)) {
    logger.panic(`Error: ${cyan(ymlPath)} not exists, task ${green(taskName)} can not build.
Is the directory ${grey(resolve(buildDir))} correct?`);
    return;
  }

  const graph = await BuildGraph.loadPartialFromYml(ymlPath);

  let changedDepOfMeta: string | undefined = undefined
  if (!(flags & FLAGS_IGNORE_META) && (changedDepOfMeta = graph.needsReconfig(buildDir))) {
    logger.printIfReadable(`${cyan(changedDepOfMeta)} changed, reconfig...`);
    const configOptions: ConfigOptions = {
      buildDir,
    };
    await configure(configOptions);

    logger.printIfReadable(`Finished, continue to build...`);
    logger.printIfReadable();
  }

  const taskOptions: RunTaskOptions = {
    flags,
    ymlPath,
    workDir: buildDir,
  }

  // needs to know if dependencies changed
  // re-write the yml files if changed
  const dependenciesChangedCell: DependenciesChangedCell = {
    changed: false,
  };
  if (taskName === '*') {
    await runAllTasks(graph, buildDir, flags, dependenciesChangedCell);
  } else {
    const tasksToRun = graph.checkDependenciesUpdated(taskName, Boolean(flags & FLAGS_FORCE_UPDATE));
    if (tasksToRun.length === 0) {
      return;
    }

    for (const taskName of tasksToRun) {
      const task = graph.tasks.get(taskName);
      if (!task) {
        logger.panic(`Task ${red(taskName)} not found!`);
        return;
      }
      const outputs = await __runTask(task, taskName, taskOptions, dependenciesChangedCell);
      for (const o of outputs) {
        logger.addOutput(o);
      }
    }
  }

  if (dependenciesChangedCell.changed) {
    await graph.dumpFiles(buildDir);
    logger.addUpdatedYml(ymlPath);
  }
}

export interface RunTaskOptions {
  flags: number;
  ymlPath: string;
  workDir: string;
}

export async function runAllTasks(graph: BuildGraph, buildDir: string, flags: number, changedCell?: DependenciesChangedCell) {
  const orderedTasks: string[] = graph.checkDependenciesUpdated('*', Boolean(flags & FLAGS_FORCE_UPDATE));
  for (const taskName of orderedTasks) {
    const task = graph.tasks.get(taskName);
    const ymlPath = makeTaskYmlFilename(buildDir, taskName);
    const options: RunTaskOptions = {
      flags,
      ymlPath,
      workDir: buildDir,
    };
    const outputs = await __runTask(task, taskName, options, changedCell);
    for (const o of outputs) {
      logger.addOutput(o);
    }
  }
}

function __runTask(task: TaskNode, taskName: string, options: RunTaskOptions, changedCell?: DependenciesChangedCell): Promise<OutputLog[]> {
  logger.plusTaskCounter();
  logger.printIfReadable(`Running task: ${green(taskName)}`);

  const { workDir: buildDir, flags } = options;

  return rebuild(taskName, task, buildDir, flags, changedCell);
}

async function rebuild(taskName: string, taskNode: TaskNode, buildDir: string, flags: number, changedCell?: DependenciesChangedCell): Promise<OutputLog[]> {
  const depsBuilder = new DependencyBuilder(); 
  const outputBuilder = new OutputBuilder();
  buildDir = resolve(buildDir);
  for (const actionStore of taskNode.actions) {
    const executeContext: ExecutionContext = {
      stage: flags & FLAGS_STAGE_MASK,
      buildDir,
      depsBuilder,
      outputBuilder,
      taskDir: join(buildDir, taskName),
      forceUpdate: Boolean(flags & FLAGS_FORCE_UPDATE),
    };
    await runActionOfTask(executeContext, taskName, actionStore);
  }

  const newDeps = depsBuilder.finalize();
  const { deps: previousDeps } = taskNode;
  if (!Deps.equals(previousDeps, newDeps)) {
    taskNode.deps = newDeps;
    if (changedCell) {
      changedCell.changed = true;
    }
  }

  const result = outputBuilder.finalize();
  taskNode.outputs = result.map(output => output.file);

  return result;
}

export async function runActionOfTask(ctx: ExecutionContext, taskName: string, rawAction: ActionStore): Promise<void> {
  const { name, params } = rawAction;
  const actionCtor = getAction(name);
  if (!actionCtor) {
    logger.panic(`Unreconized action ${red(name)}, can not rebuild task ${taskName}.`);
    return;
  }

  const action = new actionCtor(params);

  const tmp = action.execute(ctx);
	if (isUndefined(tmp)) {
		return;
	}

	return tmp;
}
