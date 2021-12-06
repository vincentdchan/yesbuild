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
    if (isArray(ctx.changedFiles)) {
      ctx.productsBuilder.enabled = false;  // disable products builder
      await this.__compileFiles(ctx, ctx.changedFiles);
      this.__prettyPrintChangedFiles(ctx.changedFiles);
      return;
    }
    const { files } = this.props;
    const matchFiles = fg.sync(files, {
      onlyFiles: true,
    });

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
