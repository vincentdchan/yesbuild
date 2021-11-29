import { ActionExecutor, registerAction, ExecutionContext } from './common';
import { Stage } from '../flags';

export class AnotherTask extends ActionExecutor {

	public static actionName: string = 'anotherTask';

  constructor(private taskName: string) {
    super();
  }

	public async execute(ctx: ExecutionContext) {
    if (ctx.stage === Stage.Configure) {
      ctx.depsBuilder.dependTask(this.taskName);
    }
  }

  getParams() {
    return this.taskName;
  }

}

registerAction(AnotherTask);
