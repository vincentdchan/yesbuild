import { useServeDir } from './hooks';
import { isString } from 'lodash-es';

const INTERNAL_ACTIONS = [
  'esbuild'
];

export function validateActionName(name: string) {
  const contain = INTERNAL_ACTIONS.includes(name);
  if (!contain) {
    throw new Error(`Action is invalid: ${name}`);
  }
}

export interface BuildOptions {
  entry: string,
  outdir?: string,
}

export interface ActionStore {
  name: string,
  params?: any;
}

export abstract class ActionExecutor {

  execute(): void { }

  getOutputs(): string[] | null | undefined {
    return undefined;
  }

  abstract toStore(): ActionStore;

}

export class EsbuildBundleExecutor extends ActionExecutor {

  public constructor(private options: BuildOptions) {
    super();
  }

  public execute() {

  }

  public getOutputs() {
    return [];
  }

  public toStore(): ActionStore {
    return {
      name: 'esbuild',
      params: this.options,
    };
  }

}
