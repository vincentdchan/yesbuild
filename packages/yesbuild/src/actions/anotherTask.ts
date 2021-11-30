import { ActionExecutor, registerAction, ExecutionContext } from './common';
import { Stage } from '../flags';

export class AnotherTask extends ActionExecutor {

	public static actionName: string = 'internal:anotherTask';

  constructor(private taskName: string) {
    super();
  }

	public execute(ctx: ExecutionContext) {
    if (ctx.stage === Stage.Configure) {
      ctx.depsBuilder.dependTask(this.taskName);
    }
  }

  getParams() {
    return this.taskName;
  }

}

registerAction(AnotherTask);
