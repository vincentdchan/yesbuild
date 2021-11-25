
const INTERNAL_ACTIONS = [
  'esbuild',
  'typescript',
];

export function validateActionName(name: string) {
  const contain = INTERNAL_ACTIONS.includes(name);
  if (!contain) {
    throw new Error(`Action is invalid: ${name}`);
  }
}

export interface ActionStore {
  name: string,
  params?: any;
}

export interface ExecuteContext {
	workDir: string,
}

export abstract class ActionExecutor {

  abstract execute(ctx: ExecuteContext): Promise<void>

  getOutputs(): string[] {
    return undefined;
  }

	getDeps(): string[] {
		return [];
	}

  abstract toStore(): ActionStore;

}

export interface ActionExecutorConstructor {
	new (options: any): ActionExecutor;
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
