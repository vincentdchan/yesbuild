import { ActionExecutor, registerAction } from './common';
import type { BuildOptions as TsBuildOptions } from 'typescript';

export class TypeScriptExecutor extends ActionExecutor {

	public static actionName: string = 'typescript'

  public constructor(private options: TsBuildOptions) {
    super();
  }

	async execute() {
		const ts = await import('typescript');
		console.log('ts', typeof ts);
	}

}

registerAction(TypeScriptExecutor);
