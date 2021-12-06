import { join, resolve } from 'path';
import { green, red, cyan } from 'chalk';
import { isUndefined } from 'lodash-es';
import configure, { ConfigOptions } from './configure';
import { Deps, DependencyBuilder } from './dependency';
import { TaskNode, BuildGraph, ActionStore } from './buildGraph';
import { getAction, ExecutionContext } from './actions';
import { FLAGS_STAGE_MASK, FLAGS_FORCE_UPDATE, FLAGS_IGNORE_META } from './flags';
import { ProductWithSize, ProductBuilder } from './product';
import logger from './logger';

export interface BuildOptions {
  buildDir: string,
  task: string,
  flags: number,
}

export async function build(options: BuildOptions) {
  const { buildDir, task: taskName, flags } = options;
  const graph = new BuildGraph(buildDir);

  let changedDepOfMeta: string | undefined = undefined
  if (!(flags & FLAGS_IGNORE_META) && (changedDepOfMeta = graph.needsReconfig())) {
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
    workDir: buildDir,
  }

  // needs to know if dependencies changed
  // re-write the yml files if changed
  const changedTasks: Set<string> = new Set();
  if (taskName === '*') {
    await runAllTasks(graph, buildDir, flags, changedTasks);
  } else {
    const { taskNamesToExecute: tasksToRun, changedFiles } = graph.checkDependenciesUpdated(taskName, Boolean(flags & FLAGS_FORCE_UPDATE));
    if (tasksToRun.length === 0) {
      return;
    }

    for (const taskName of tasksToRun) {
      const task = graph.loadTask(taskName);
      if (!task) {
        logger.panic(`Task ${red(taskName)} not found!`);
        return;
      }
      const outputs = await __runTask(task, taskName, taskOptions, changedTasks, changedFiles);
      for (const o of outputs) {
        logger.addOutput(o);
      }
    }
  }

  if (changedTasks.size > 0) {
    await graph.dumpFiles([...changedTasks]);
  }
}

export interface RunTaskOptions {
  flags: number;
  workDir: string;
}

export async function runAllTasks(graph: BuildGraph, buildDir: string, flags: number, changedTasks?: Set<string>) {
  const { taskNamesToExecute: orderedTasks } = graph.checkDependenciesUpdated('*', Boolean(flags & FLAGS_FORCE_UPDATE));
  for (const taskName of orderedTasks) {
    const task = graph.loadTask(taskName);
    const options: RunTaskOptions = {
      flags,
      workDir: buildDir,
    };
    const outputs = await __runTask(task, taskName, options, changedTasks);
    for (const o of outputs) {
      logger.addOutput(o);
    }
  }
}

function __runTask(task: TaskNode, taskName: string, options: RunTaskOptions, changedTasks?: Set<string>, changedFiles?: string[]): Promise<ProductWithSize[]> {
  logger.plusTaskCounter();
  logger.printIfReadable(`Running task: ${green(taskName)}`);

  const { workDir: buildDir, flags } = options;

  return rebuild(taskName, task, buildDir, flags, changedTasks, changedFiles);
}

async function rebuild(taskName: string, taskNode: TaskNode, buildDir: string, flags: number, changedTasks?: Set<string>, changedFiles?: string[]): Promise<ProductWithSize[]> {
  const depsBuilder = new DependencyBuilder(); 
  const outputBuilder = new ProductBuilder();
  buildDir = resolve(buildDir);
  for (const actionStore of taskNode.actions) {
    const executeContext: ExecutionContext = {
      stage: flags & FLAGS_STAGE_MASK,
      buildDir,
      depsBuilder,
      productsBuilder: outputBuilder,
      taskDir: join(buildDir, taskName),
      forceUpdate: Boolean(flags & FLAGS_FORCE_UPDATE),
      changedFiles,
    };
    await runActionOfTask(executeContext, taskName, actionStore);
  }

  if (depsBuilder.enabled) {
    const newDeps = depsBuilder.finalize();
    const { deps: previousDeps } = taskNode;
    if (!Deps.equals(previousDeps, newDeps)) {
      taskNode.deps = Deps.merge(taskNode.deps, newDeps);
      if (changedTasks) {
        changedTasks.add(taskName);
      }
    }
  }

  const result = outputBuilder.finalize();

  // only update the graph if outputBuilder is enabled
  if (outputBuilder.enabled) {
    taskNode.products = result.map(output => output.file);
  }

  return result;
}

export async function runActionOfTask(ctx: ExecutionContext, taskName: string, rawAction: ActionStore): Promise<void> {
  const { name, props } = rawAction;
  let actionCtor = getAction(name);
  if (!actionCtor) {
    require(name);  // load the plugins
  }
  actionCtor = getAction(name);
  if (!actionCtor) {
    logger.panic(`Unreconized action ${red(name)}, can not rebuild task ${taskName}.`);
    return;
  }

  const action = new actionCtor(props);

  const tmp = action.execute(ctx);
	if (isUndefined(tmp)) {
		return;
	}

	return tmp;
}
