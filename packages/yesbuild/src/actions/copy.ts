import { ActionExecutor, registerAction, ExecutionContext } from './common';
import { isString, isArray, isUndefined } from 'lodash-es';
import { join, relative, dirname } from 'path';
import * as fs from 'fs';
import { Stage } from '../flags';

export interface CopyExecutorOptions {
  src: string | string[];
  dest?: string;
  options?: { relative?: string }
}

export class CopyExecutor extends ActionExecutor {

	public static actionName: string = 'internal:copy'
  private __src: string | string[];
  private __dest?: string;

  public constructor(private options: CopyExecutorOptions) {
    super();
    this.__src = options.src;
    this.__dest = options.dest;
  }

  // only copy when configure
	public async execute(ctx: ExecutionContext): Promise<void> {
    if (ctx.stage !== Stage.Configure) {
      return;
    }
    let sourceFiles: string [];
    let relativeDir: string;

    if (this.options.options && this.options.options.relative) {
      relativeDir = this.options.options.relative;
    } else {
      relativeDir = process.cwd();
    }

    if (isString(this.__src)) {
      const { default: glob } = await import('glob');
      sourceFiles = glob.sync(this.__src);
    } else if (isArray(this.__src)) {
      sourceFiles = this.__src;
    }

    for (const f of sourceFiles) {
      ctx.depsBuilder.dependFile(f);
    }

    let destDir = this.__dest;
    if (isUndefined(destDir)) {
      const { taskDir } = ctx;
      destDir = taskDir;
    }
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive:true })
    }

    for (const sourceFile of sourceFiles) {
      try {
        const stat = fs.statSync(sourceFile);
        if (!stat.isFile()) {
          continue;
        }
      } catch (err) {
        continue;
      }
      const relativePath = relative(relativeDir, sourceFile);

      const dest = join(destDir, relativePath);
      const dir = dirname(dest);
      fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(sourceFile, dest);
      const stat = fs.statSync(dest);
      ctx.productsBuilder.push(dest, stat.size);
    }
  }

  getParams(): CopyExecutorOptions {
    return this.options;
  }

}

registerAction(CopyExecutor);
