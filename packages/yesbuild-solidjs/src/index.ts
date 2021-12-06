import { ActionExecutor, ExecutionContext, mount } from 'yesbuild-core';
import fg from 'fast-glob';
import { isArray } from 'lodash-es';
import { grey } from 'chalk';
import { transformSolidJS } from './transform';

export interface SolidJsProps {
  files: string | string[];
  relative: string;
}

class SolidJSActionExecutor extends ActionExecutor<SolidJsProps> {

  public static actionName = 'yesbuild-solidjs';

  public constructor(props: SolidJsProps) {
    super(props);
  }

  private __prettyPrintChangedFiles(files: string[]) {
    console.log('Transformed SolidJS files:')
    for (const file of files) {
      console.log(`- ${file}`);
    }
  }

  public async execute(ctx: ExecutionContext) {
    const { files } = this.props;
    const matchFiles = fg.sync(files, {
      onlyFiles: true,
    });

    if (isArray(ctx.changedFiles) && ctx.changedFiles.length > 0) {
      const changedSet = new Set(ctx.changedFiles);
      const solidChangedFiles = matchFiles
        .map(path => path.startsWith('./') ? path.slice(2) : path)
        .filter(file => changedSet.has(file)) // not all the changedFiles are for this task;
      this.__prettyPrintChangedFiles(solidChangedFiles);
      ctx.productsBuilder.enabled = false;  // disable products builder
      ctx.depsBuilder.enabled = false;
      await this.__compileFiles(ctx, solidChangedFiles);
      return;
    }

    return this.__compileFiles(ctx, matchFiles);
  }

  // Can do parallel
  private async __compileFiles(ctx: ExecutionContext, files: string[]) {
    const { relative } = this.props;
    const { taskDir } = ctx;
    for (const file of files) {
      const [transformed, bytesLen] = await transformSolidJS(file, relative, taskDir);
      ctx.depsBuilder.dependFile(file);
      ctx.productsBuilder.push(transformed, bytesLen);
    }
  }

}

mount(SolidJSActionExecutor);

export function useSolidJS(props: SolidJsProps): SolidJSActionExecutor {
  return new SolidJSActionExecutor(props);
}
