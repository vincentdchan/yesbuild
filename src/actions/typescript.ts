import { isUndefined } from 'lodash-es';
import * as path from 'path';
import { ActionExecutor, registerAction, ExecutionContext } from './common';
import ts from 'typescript';
import * as tsconfig from 'tsconfig';

function fileExists(fileName: string) {
  return ts.sys.fileExists(fileName);
}

export interface TypeScriptBuildOptions {
  entries: string[],
  compilerOptions?: ts.CompilerOptions,
}

export class TypeScriptExecutor extends ActionExecutor {

	public static actionName: string = 'typescript'
  private __program: ts.Program;
  private __config: any;

  public constructor(private options: TypeScriptBuildOptions) {
    super();
    if (isUndefined(options)) {
      throw new Error(`Internal Error <TypeScriptExecutor>: options is undefined`);
    }
  }

	async execute(ctx: ExecutionContext) {
    const configFile = ts.findConfigFile(process.cwd(), fileExists);
    if (!isUndefined(configFile)) {
      this.__config = tsconfig.readFileSync(configFile);
      this.dependencyBuilder.dependFile(configFile);
    }

    let options: ts.CompilerOptions = {};
    if (this.__config && 'compilerOptions' in this.__config) {
      Object.assign(options, this.__config.compilerOptions);
    }

    if (this.options.compilerOptions) {
      Object.assign(options, this.options.compilerOptions);
    }

    const { entries } = this.options;
    const { taskDir } = ctx;

    this.__program = ts.createProgram({
      rootNames: entries,
      options: {
        ...options,
        outDir: taskDir,
      },
    });

    this.__program.emit(undefined, undefined, undefined, true);

    const currentDir = process.cwd();
    const sourceFiles = this.__program.getSourceFiles();
    for (const src of sourceFiles) {
      const { fileName } = src;
      const relativePath = path.relative(currentDir, fileName);
      this.dependencyBuilder.dependFile(relativePath);
    }
	}

  getParams() {
    return this.options;
  }

}

registerAction(TypeScriptExecutor);
