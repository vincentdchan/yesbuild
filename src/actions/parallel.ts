import { ActionExecutor, registerAction } from './common';

export class ParallelExecutor extends ActionExecutor {
	
	public static actionName: string = 'parallel';

  public constructor(private tasks: string[]) {
    super();
  }

	async execute() {

	}

	public getParams(): string[] {
		return this.tasks;
	}

	public getDeps(): string[] {
		return this.tasks.map(taskName => 'task://' + taskName);
	}

}

registerAction(ParallelExecutor);
