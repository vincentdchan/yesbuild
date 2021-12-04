import { ActionExecutor, ExecutionContext, mount } from 'yesbuild-core';
import fg from 'fast-glob';
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

  public async execute(ctx: ExecutionContext) {
    const { files ,relative } = this.props;
    const { taskDir } = ctx;
    const matchFiles = fg.sync(files, {
      onlyFiles: true,
    });

    // Can do parallel
    for (const file of matchFiles) {
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
