import { DependencyBuilder } from '../dependency';
import { ProductBuilder } from '../product';
import { Stage } from '../flags';

export interface ExecutionContext {
  stage: Stage,
  depsBuilder: DependencyBuilder,
  productsBuilder: ProductBuilder,
  buildDir: string,
	taskDir: string,
  forceUpdate: boolean,
}

/**
 * An ancester of all executors,
 * an executor defined how yesbuild to execute an action
 */
export abstract class ActionExecutor<T = undefined> {

  #props: T

  /**
   * Return the outputs files so yesbuild can know what files
   * to track, and when to re-execute the action.
   */
  constructor(props: T) {
    this.#props = props;
  }

  public execute(ctx: ExecutionContext): Promise<void> | void {}

  /**
   * The props is the `config` of this action, and it's persistent.
   * It will be stored in the yml file.
   * 
   * When the action is re-construct, it will be passed form
   * the constructor, so the action can be rebuilt.
   */
  public get props(): T {
    return this.#props;
  }

}

export interface ActionExecutorConstructor<T = undefined> {
  new(props: T): ActionExecutor<T>;
  actionName: string;
}

const actionRegistry: Map<string, ActionExecutorConstructor<any>> = new Map();

export function registerAction<T>(ctr: ActionExecutorConstructor<T>) {
  const { actionName } = ctr;
  actionRegistry.set(actionName, ctr);
}

export function getAction(name: string): ActionExecutorConstructor {
  return actionRegistry.get(name);
}
