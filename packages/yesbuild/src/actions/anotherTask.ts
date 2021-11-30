import { ActionExecutor, registerAction, ExecutionContext } from './common';
import { Stage } from '../flags';

export class AnotherTask extends ActionExecutor<string> {

	public static actionName: string = 'internal:anotherTask';

  constructor(private taskName: string) {
    super(taskName);
  }

	public execute(ctx: ExecutionContext) {
    if (ctx.stage === Stage.Configure) {
      ctx.depsBuilder.dependTask(this.taskName);
    }
  }

}

registerAction(AnotherTask);
