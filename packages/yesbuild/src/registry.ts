import { ActionExecutor } from './actions';
import type { ProductWithSize } from './product';

export interface ActionResult {
  products?: ProductWithSize[];
  taskDir?: string;  // only available
}

export type ActionExecutorGenerator = Generator<ActionExecutor<any>, ActionExecutor<any> | void, ActionResult>;
export type TaskCallback = () => ActionExecutor<any> | ActionExecutorGenerator | void;

interface Task {
  name: string,
  userCallback: TaskCallback;
}

export class RegistryContext {

  public readonly tasks: Map<string, Task> = new Map();

  public constructor() {}

  public defineTask(name: string, callback: TaskCallback) {
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

  #ctx: RegistryContext = new RegistryContext();

  public constructor() {}

  public defineTask(name: string, callback: TaskCallback) {
    this.#ctx.defineTask(name, callback);
  }

  /**
   * return the old context, create new one
   */
  public takeContext() {
    const result = this.#ctx;
    this.#ctx = new RegistryContext();
    return result;
  }

}

export default new Registry();
