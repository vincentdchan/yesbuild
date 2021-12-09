import { ActionExecutor, mount, ExecutionContext } from 'yesbuild-core';

export interface RollupOptions {
  config?: string;
}

class RollupActionExecutor extends ActionExecutor<RollupOptions> {

  public static actionName = "yesbuild-rollup";

  public execute(ctx: ExecutionContext) {

  }

}

mount(RollupActionExecutor);

export function useRollup(options?: RollupOptions): RollupActionExecutor {
  return new RollupActionExecutor(options ? options : {});
}
