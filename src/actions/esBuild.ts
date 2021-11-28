import { ActionExecutor, registerAction, ExecuteContext } from './common';
import {
  build as esbuild,
  BuildOptions as EsBuildOptions,
  Metafile as EsMetaFile,
} from 'esbuild';

export interface BuildOptions {
  entry: string,
  platform: string,
  outdir?: string,
  external?: string[],
}

export class EsbuildBundleExecutor extends ActionExecutor {

  public static actionName: string = 'esbuild'

  private __outputs: string[] = [];

  public constructor(private options: BuildOptions) {
    super();
  }

  public async execute(ctx: ExecuteContext) {
    const { entry, platform, external } = this.options;
    const { workDir } = ctx;
    const esBuildOptions: EsBuildOptions = {
      entryPoints: [entry],
      bundle: true,
      format: 'esm',
      logLevel: 'error',
      splitting: true,
      outdir: workDir,
      sourcemap: true,
      platform: platform as any,
      metafile: true,
      external,
      plugins: []
    };

    const result = await esbuild(esBuildOptions);
    const metafile = result.metafile!;
    this.buildGraphFromEsBuild(metafile);
  }

  buildGraphFromEsBuild(metafile: EsMetaFile) {
    const { outputs } = metafile;
    for (const key of Object.keys(outputs)) {
      const output = outputs[key];
      this.__outputs.push(key);

      for (const dep of Object.keys(output.inputs)) {
        this.dependencyBuilder.dependFile(dep);
      }
    }
  }

  public getOutputs() {
    return this.__outputs;
  }

  public getParams(): BuildOptions {
    return this.options;
  }

}

registerAction(EsbuildBundleExecutor);
