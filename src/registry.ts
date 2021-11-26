import { validateActionName } from './actions';
import { isUndefined } from 'lodash-es';
import { BuildGraph, TaskNode, ActionStore, makeTaskNode } from './buildGraph';
import { newDependencyBuilder } from './dependency'

export type TaskCallback = () => void | undefined | null | string[];

interface Task {
  name: string,
  userCallback: TaskCallback;
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

  public constructor() {}

  public registerTask(name: string, callback: TaskCallback) {
    const task: Task = {
      name,
      userCallback: callback,
    };
    this.__tasks.set(name, task);
  }

  public executeTaskToCollectDeps(graph: BuildGraph, buildDir: string, taskName?: string) {
    if (isUndefined(taskName)) {
      return this.__executeAllTasks(graph, buildDir);
    }

    return this.__executeTaskToCollectDeps(graph, buildDir, taskName);
  }

  /**
   * Set a global dependency collector to collects dependencies
   */
  private __executeTaskToCollectDeps(graph: BuildGraph, buildDir: string, taskName: string) {
    const taskNode = getOrNewTaskNode(graph, taskName);
    const builder = newDependencyBuilder(graph, buildDir, taskNode);
    const task = this.__tasks.get(taskName);
    if (!task) {
      throw new Error(`Collecting depencencies failed: task '${taskName}' not found`);
    }

    // call the user method to collect deps
    task.userCallback.call(undefined);

    builder.finalize();

    for (const actionExecutor of builder.actions) {
      const params = actionExecutor.getParams();
      const store: ActionStore = {
        name: (actionExecutor.constructor as any).actionName,
        params,
      }
      validateActionName(store.name);
      taskNode.actions.push(store);
    }
  }

  private __executeAllTasks(graph: BuildGraph, buildDir: string) {
    for (const [key] of this.__tasks) {
      this.__executeTaskToCollectDeps(graph, buildDir, key);
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
