import { ActionExecutor, mount, ExecutionContext } from './common';
import {
  build as esbuild,
  BuildOptions as EsBuildOptions,
  Metafile as EsMetaFile,
  Format as EsFormat,
  Platform as EsPlatform,
} from 'esbuild';

export interface EsBuildProps {
  entryPoints: string[],
  platform?: EsPlatform,
  bundle?: boolean
  format?: EsFormat,
  splitting?: boolean,
  outdir?: string,
  sourcemap?: boolean | 'inline' | 'external' | 'both';
  external?: string[],
  ignoreDeps?: boolean,
}

export class EsbuildBundleExecutor extends ActionExecutor<EsBuildProps> {

  public static actionName: string = 'internal:esbuild'

  public constructor(props: EsBuildProps) {
    super(props);
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
    } = this.props;
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
    const { ignoreDeps } = this.props;
    for (const key of Object.keys(outputs)) {
      const output = outputs[key];
      ctx.productsBuilder.push(key, output.bytes);

      if (ignoreDeps) {
        continue;
      }
      for (const dep of Object.keys(output.inputs)) {
        ctx.depsBuilder.dependFile(dep);
      }
    }
  }

}

mount(EsbuildBundleExecutor);
