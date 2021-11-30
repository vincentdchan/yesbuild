import { isUndefined } from 'lodash-es';
import * as fs from 'fs';
import * as path from 'path';
import { ActionExecutor, registerAction, ExecutionContext } from './common';
import ts from 'typescript';
import * as tsconfig from 'tsconfig';

function fileExists(fileName: string) {
  return ts.sys.fileExists(fileName);
}

export interface TypeScriptBuildOptions {
  rootNames: string[],
  compilerOptions?: ts.CompilerOptions,
}

function cleanFilesInDir(dir: string) {
  const children = fs.readdirSync(dir);

  for (const child of children) {
    const childPath = path.join(dir, child);
    const stat = fs.statSync(childPath);
    if (stat.isFile() && /(.+)\.d\.ts/.test(child)) {
      fs.rmSync(childPath);
    } else if (stat.isDirectory()) {
      cleanFilesInDir(childPath);
    }
  }
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

  execute(ctx: ExecutionContext) {
    const configFile = ts.findConfigFile(process.cwd(), fileExists);
    if (!isUndefined(configFile)) {
      this.__config = tsconfig.readFileSync(configFile);
      ctx.depsBuilder.dependFile(configFile);
    }

    let options: ts.CompilerOptions = {};
    if (this.__config && 'compilerOptions' in this.__config) {
      Object.assign(options, this.__config.compilerOptions);
    }

    if (this.options.compilerOptions) {
      Object.assign(options, this.options.compilerOptions);
    }

    const { rootNames } = this.options;
    const { taskDir } = ctx;
    if (fs.existsSync(taskDir)) {
      cleanFilesInDir(taskDir);
    } else {
      fs.mkdirSync(taskDir);
    }

    this.__program = ts.createProgram({
      rootNames,
      options: {
        ...options,
        outDir: taskDir,
      },
    });

    this.__program.emit(undefined, undefined, undefined, true);
    this.__scanOutputs(ctx, taskDir);

    const currentDir = process.cwd();
    const sourceFiles = this.__program.getSourceFiles();
    for (const src of sourceFiles) {
      const { fileName } = src;
      const relativePath = path.relative(currentDir, fileName);
      ctx.depsBuilder.dependFile(relativePath);
    }
  }

  private __scanOutputs(ctx: ExecutionContext, dir: string) {
    const children = fs.readdirSync(dir);

    for (const child of children) {
      const childPath = path.join(dir, child);
      const stat = fs.statSync(childPath);
      if (stat.isFile() && /(.+)\.d\.ts/.test(child)) {
        ctx.productsBuilder.push(childPath, stat.size);
      } else if (stat.isDirectory()) {
        this.__scanOutputs(ctx, childPath);
      }
    }
  }

  getParams() {
    return this.options;
  }

}

registerAction(TypeScriptExecutor);
