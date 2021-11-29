import { join } from 'path';
import { ActionExecutor, ExecutionContext } from './actions';
import { isUndefined, isFunction } from 'lodash-es';
import { BuildGraph, TaskNode, ActionStore, makeTaskNode } from './buildGraph';
import type { OutputLog } from './output';
import { newYesbuildContext, YesbuildContext } from "./context";
import { Stage } from './flags';
import { runActionOfTask } from './build';

export interface ActionResult {
  outputs?: OutputLog[];
}

export type ActionExecutorGenerator = Generator<ActionExecutor, ActionExecutor | void, ActionResult>;
export type TaskCallback = () => ActionExecutor | ActionExecutorGenerator | void;

interface Task {
  name: string,
  userCallback: TaskCallback;
}

interface TaskCollectorContinuation {
  ctx: YesbuildContext;
  generator: ActionExecutorGenerator;
  lastResult?: ActionResult;
}

function getOrNewTaskNode(graph: BuildGraph, taskName: string): TaskNode {
  let taskNode = graph.tasks.get(taskName);
  if (!taskNode) {
    taskNode = makeTaskNode();
    graph.tasks.set(taskName, taskNode);
  }

  return taskNode;
}

export class RegistryContext {

  private __tasks: Map<string, Task> = new Map();
  private __taskContinuations: Map<string, TaskCollectorContinuation> = new Map();

  public constructor() {}

  public registerTask(name: string, callback: TaskCallback) {
    const task: Task = {
      name,
      userCallback: callback,
    };
    this.__tasks.set(name, task);
  }

  public executeTaskToCollectDeps(graph: BuildGraph, buildDir: string, taskName?: string): Promise<void> {
    if (isUndefined(taskName)) {
      return this.__executeAllTasks(graph, buildDir);
    }

    return this.__executeTaskToCollectDeps(graph, buildDir, taskName);
  }

  private async __executeAllTasks(graph: BuildGraph, buildDir: string): Promise<void> {
    for (const [key] of this.__tasks) {
      await this.__executeTaskToCollectDeps(graph, buildDir, key);
    }
  }

  /**
   * Set a global dependency collector to collects dependencies
   */
  private async __executeTaskToCollectDeps(graph: BuildGraph, buildDir: string, taskName: string): Promise<void> {
    const taskNode = getOrNewTaskNode(graph, taskName);
    const taskDir = join(buildDir, taskName);
    const ctx = newYesbuildContext(graph, taskDir, taskNode);
    const task = this.__tasks.get(taskName);
    if (!task) {
      throw new Error(`Collecting depencencies failed: task '${taskName}' not found`);
    }

    // call the user method to collect deps
    const actionExecutor = task.userCallback();
    if (actionExecutor instanceof ActionExecutor) {
      await this.__testActionExecutor(ctx, actionExecutor, buildDir, taskNode, taskName);
      ctx.finalize();
    } else if (actionExecutor && isFunction(actionExecutor.next)) {
      this.__taskContinuations.set(taskName, {
        ctx,
        generator: actionExecutor,
      });
      return this.__testActionExecutorGenerator(actionExecutor, buildDir, taskNode, taskName);
    }
  }

  private __testActionExecutor(ctx: YesbuildContext, executor: ActionExecutor, buildDir: string, taskNode: TaskNode, taskName: string): Promise<void> {
    const params = executor.getParams();
    const store: ActionStore = {
      name: (executor.constructor as any).actionName,
      params,
    }
    const actionIndex = taskNode.actions.length;
    taskNode.actions.push(store);

    const { depsBuilder, outputsBuilder } = ctx;

    const executeContext: ExecutionContext = {
      stage: Stage.Configure,
      buildDir,
      depsBuilder,
      outputBuilder: outputsBuilder,
      taskDir: join(buildDir, taskName),
      forceUpdate: false,
    };
    return runActionOfTask(executeContext, taskName, taskNode, actionIndex);
  }

  private async __testActionExecutorGenerator(generator: ActionExecutorGenerator, buildDir: string, taskNode: TaskNode, taskName: string): Promise<void> {
    const continuation = this.__taskContinuations.get(taskName);
    const { lastResult, ctx } = continuation;
    const next = generator.next(lastResult);

    if (next.value instanceof ActionExecutor) {
      await this.__testActionExecutor(ctx, next.value, buildDir, taskNode, taskName);
      ctx.addDeps(taskNode.deps);
      continuation.lastResult = {
        outputs: ctx.outputsBuilder.finalize(),
      };
    }

    if (next.done) {
      ctx.finalize();
    } else {
      this.__testActionExecutorGenerator(generator, buildDir, taskNode, taskName);
    }
  }

}

/**
 * This is an instance for user's build script to register
 * their tasks and dependency.
 */
class Registry {

  private __ctx: RegistryContext = new RegistryContext();

  public constructor() {}

  public registerTask(name: string, callback: TaskCallback) {
    this.__ctx.registerTask(name, callback);
  }

  /**
   * return the old context, create new one
   */
  public takeContext() {
    const result = this.__ctx;
    this.__ctx = new RegistryContext();
    return result;
  }

}

export default new Registry();
