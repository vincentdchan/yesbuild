import { ActionExecutor, registerAction, ExecutionContext } from './common';
import {
  build as esbuild,
  BuildOptions as EsBuildOptions,
  Metafile as EsMetaFile,
  Format as EsFormat,
  Platform as EsPlatform,
} from 'esbuild';

export interface BuildOptions {
  entryPoints: string[],
  platform?: EsPlatform,
  bundle?: boolean
  format?: EsFormat,
  splitting?: boolean,
  outdir?: string,
  sourcemap?: boolean | 'inline' | 'external' | 'both';
  external?: string[],
}

export class EsbuildBundleExecutor extends ActionExecutor {

  public static actionName: string = 'internal:esbuild'

  public constructor(private options: BuildOptions) {
    super();
  }

  public async execute(ctx: ExecutionContext) {
    const {
      entryPoints,
      bundle,
      platform,
      format,
      splitting,
      sourcemap,
      external,
    } = this.options;
    const { taskDir } = ctx;
    const esBuildOptions: EsBuildOptions = {
      entryPoints,
      bundle,
      format,
      splitting,
      sourcemap,
      platform,
      external,
      logLevel: 'error',
      outdir: taskDir,
      metafile: true,
      plugins: []
    };

    const result = await esbuild(esBuildOptions);
    const metafile = result.metafile!;
    this.buildGraphFromEsBuild(ctx, metafile);
  }

  buildGraphFromEsBuild(ctx: ExecutionContext, metafile: EsMetaFile) {
    const { outputs } = metafile;
    for (const key of Object.keys(outputs)) {
      const output = outputs[key];
      ctx.productsBuilder.push(key, output.bytes);

      for (const dep of Object.keys(output.inputs)) {
        ctx.depsBuilder.dependFile(dep);
      }
    }
  }

  public getParams(): BuildOptions {
    return this.options;
  }

}

registerAction(EsbuildBundleExecutor);
