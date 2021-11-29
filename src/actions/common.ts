import { DependencyBuilder } from '../dependency';
import { OutputLog } from '../logger';

const INTERNAL_ACTIONS = [
  'esbuild',
  'typescript',
  'parallel',
];

export function validateActionName(name: string) {
  const contain = INTERNAL_ACTIONS.includes(name);
  if (!contain) {
    throw new Error(`Action is invalid: ${name}`);
  }
}

export interface ExecuteContext {
  buildDir: string,
	taskDir: string,
  forceUpdate: boolean,
}

/**
 * An ancester of all executors,
 * an executor defined how yesbuild to execute an action
 */
export abstract class ActionExecutor {

  public readonly dependencyBuilder: DependencyBuilder = new DependencyBuilder();

  constructor() {}

  abstract execute(ctx: ExecuteContext): Promise<void>

  /**
   * Return the outputs files so yesbuild can know what files
   * to track, and when to re-execute the action.
   */
  getOutputs(): OutputLog[] {
    return [];
  }

  /**
   * The params is the `config` of this action, and it's persistent.
   * It will be stored in the yml file.
   * 
   * When the action is re-construct, it will be passed form
   * the constructor, so the action can be rebuilt.
   */
  getParams(): any | undefined | void { }

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
