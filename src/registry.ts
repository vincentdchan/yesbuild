import { ActionExecutor } from './actions';
import type { OutputLog } from './output';

export interface ActionResult {
  outputs?: OutputLog[];
}

export type ActionExecutorGenerator = Generator<ActionExecutor, ActionExecutor | void, ActionResult>;
export type TaskCallback = () => ActionExecutor | ActionExecutorGenerator | void;

interface Task {
  name: string,
  userCallback: TaskCallback;
}

export class RegistryContext {

  public readonly tasks: Map<string, Task> = new Map();

  public constructor() {}

  public registerTask(name: string, callback: TaskCallback) {
    const task: Task = {
      name,
      userCallback: callback,
    };
    this.tasks.set(name, task);
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
