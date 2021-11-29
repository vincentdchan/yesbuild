import { DependencyBuilder } from '../dependency';
import { OutputBuilder } from '../output';
import { Stage } from '../flags';

export interface ExecutionContext {
  stage: Stage,
  depsBuilder: DependencyBuilder,
  outputBuilder: OutputBuilder,
  buildDir: string,
	taskDir: string,
  forceUpdate: boolean,
}

/**
 * An ancester of all executors,
 * an executor defined how yesbuild to execute an action
 */
export abstract class ActionExecutor {

  /**
   * Return the outputs files so yesbuild can know what files
   * to track, and when to re-execute the action.
   */
  constructor() {}

  public execute(ctx: ExecutionContext): Promise<void> | void {}

  /**
   * The params is the `config` of this action, and it's persistent.
   * It will be stored in the yml file.
   * 
   * When the action is re-construct, it will be passed form
   * the constructor, so the action can be rebuilt.
   */
  abstract getParams(): any | undefined | void;

}

export interface ActionExecutorConstructor {
  new(options: any): ActionExecutor;
  actionName: string;
}

const actionRegistry: Map<string, ActionExecutorConstructor> = new Map();

export function registerAction(ctr: ActionExecutorConstructor) {
  const { actionName } = ctr;
  actionRegistry.set(actionName, ctr);
}

export function getAction(name: string): ActionExecutorConstructor {
  return actionRegistry.get(name);
}
