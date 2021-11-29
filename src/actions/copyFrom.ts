import { ActionExecutor, registerAction, ExecutionContext } from './common';
import { isString, isArray } from 'lodash-es';
import { basename, join } from 'path';
import * as fs from 'fs';
import { Stage } from '../flags';

export class CopyFromExecutor extends ActionExecutor {

	public static actionName: string = 'copyfrom'

  public constructor(public readonly src: string | string[]) {
    super();
  }

  // only copy when configure
	public async execute(ctx: ExecutionContext) {
    if (ctx.stage !== Stage.Configure) {
      return;
    }
    if (isString(this.src)) {
      ctx.depsBuilder.dependFile(this.src);
    } else if (isArray(this.src)) {
      for (const f of this.src) {
        ctx.depsBuilder.dependFile(f);
      }
    }
    const { taskDir } = ctx;
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive:true })
    }

    const files = isString(this.src) ? [this.src] : this.src;
    for (const file of files) {
      const filename = basename(file);
      const dest = join(taskDir, filename);
      fs.copyFileSync(file, dest);
      const stat = fs.statSync(dest);
      ctx.outputBuilder.push(dest, stat.size);
    }
  }

  getParams() {
    return this.src;
  }

}

registerAction(CopyFromExecutor);
