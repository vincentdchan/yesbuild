import { ActionExecutor, mount, ExecutionContext } from 'yesbuild-core';
import * as fs from 'fs';
import rollup, { InputOptions, OutputOptions, RollupBuild, RollupOutput } from 'rollup';

export interface RollupOptions {
  input?: InputOptions;
  output?: OutputOptions;
}

class RollupActionExecutor extends ActionExecutor<RollupOptions> {

  public static actionName = "yesbuild-rollup";

  public async execute(ctx: ExecutionContext) {
    const { input, output: outputOptions } = this.props;

    const bundle = await rollup.rollup(input);
    this.__buildDependency(ctx, bundle);

    const output = await bundle.write(outputOptions);
    this.__buildOutputs(ctx, output);

    await bundle.close();
  }

  private __buildDependency(ctx: ExecutionContext, bundle: RollupBuild) {
    for (const file of bundle.watchFiles) {
      ctx.depsBuilder.dependFile(file);
    }
  }

  private __buildOutputs(ctx: ExecutionContext, output: RollupOutput) {
    for (const item of output.output) {
      const { fileName } = item;
      const stat = fs.statSync(fileName);
      ctx.productsBuilder.push(fileName, stat.size);
    }
  }

}

mount(RollupActionExecutor);

export function useRollup(options?: RollupOptions): RollupActionExecutor {
  return new RollupActionExecutor(options ? options : {});
}
