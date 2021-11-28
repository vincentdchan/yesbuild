import { ActionExecutor, registerAction, ExecuteContext } from './common';
import { fork } from 'child_process';
import { resolve } from 'path';
import { green } from 'chalk';
import { isUndefined } from 'lodash-es';
import logger from '../logger';

/**
 * child process's data will print to stderr
 */
function forkAsync(command: string, args: string[]): Promise<any | undefined> {
  const child = fork(command, args);

  const promise = new Promise<any | undefined>((resolve, reject) => {
    child.on('error', reject);

    child.on('message', (data) => {
      resolve(data);
    });

    child.on('close', () => {
      resolve(undefined);
    });
  });

  return promise;
}

export class ParallelExecutor extends ActionExecutor {

  public static actionName: string = 'parallel';

  public constructor(private tasks: string[]) {
    super();
    this.dependencyBuilder.addDep('*');
  }

  async execute(ctx: ExecuteContext) {
    await this.__executeAll(ctx);
  }

  private async __executeAll(ctx: ExecuteContext) {
    const tasks = this.tasks.map(name => this.__executeTask(name, ctx));
    const tuples = await Promise.all(tasks);
    for (const [, out] of tuples) {
      // no output or all of them are whitespaces, ignore them
      if (!isUndefined(out)) {
        logger.mergesOutput(out);
      }
    }
  }

  /**
   * fork self to execute task
   */
  private async __executeTask(taskName: string, ctx: ExecuteContext): Promise<[string, any | undefined]> {
    logger.printIfReadable(`Spwaning task ${green(taskName)}`);
    const { workDir } = ctx;
		const rootBuildDir = resolve(workDir, '..'); 
    const args: string[] = [
      'build',
      rootBuildDir,
      '-t',
      taskName,
      '--log',
      'json',
    ];

    const stdout = await forkAsync(__filename, args);

    return [taskName, stdout];
  }

  public getParams(): string[] {
    return this.tasks;
  }

}

registerAction(ParallelExecutor);
