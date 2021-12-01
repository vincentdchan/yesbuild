import { isString, isArray, isUndefined } from 'lodash-es';
import { join, relative, dirname } from 'path';
import * as fs from 'fs';
import fg from 'fast-glob';
import { ActionExecutor, mount, ExecutionContext } from './common';

export interface CopyExecutorProps {
  src: string | string[];
  dest?: string;
  options?: { relative?: string }
}

export class CopyExecutor extends ActionExecutor<CopyExecutorProps> {

	public static actionName: string = 'internal:copy'
  private __src: string | string[];
  private __dest?: string;

  public constructor(props: CopyExecutorProps) {
    super(props);
    this.__src = props.src;
    this.__dest = props.dest;
  }

  // only copy when configure
	public execute(ctx: ExecutionContext) {
    let sourceFiles: string [];
    let relativeDir: string;

    if (this.props.options && this.props.options.relative) {
      relativeDir = this.props.options.relative;
    } else {
      relativeDir = process.cwd();
    }

    if (isString(this.__src)) {
      sourceFiles = fg.sync(this.__src);
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

}

mount(CopyExecutor);
