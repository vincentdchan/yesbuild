import { ActionExecutor, registerAction, ExecuteContext } from './common';
import { isUndefined } from 'lodash-es';
import { fork, ForkOptions } from 'child_process';
import { green } from 'chalk';
import { performance } from 'perf_hooks';
import BufferList from 'bl';
import { makeTaskDep } from '../dependency';

class ForkError extends Error {

  constructor(
    public readonly error: string,
    public readonly code: number,
    public readonly stdout: any) {
    super(error);
  }

}

function forkAsync(command: string, args: string[], options?: ForkOptions): Promise<string> {
  const child = fork(command, args, options)
  const stdout = new BufferList();
  const stderr = new BufferList();

  if (child.stdout) {
    child.stdout.on('data', data => {
      stdout.append(data)
    })
  }

  if (child.stderr) {
    child.stderr.on('data', data => {
      stderr.append(data)
    })
  }

  const promise = new Promise<string>((resolve, reject) => {
    child.on('error', reject)

    child.on('close', code => {
      if (code === 0) {
        resolve(stdout.toString())
      } else {
        const err = new ForkError(`child exited with code ${code}`, code, stdout);
        reject(err)
      }
    })
  })

  return promise;
}

export class ParallelExecutor extends ActionExecutor {
	
	public static actionName: string = 'parallel';

	public constructor(private tasks: string[]) {
		super();
	}

	async execute(ctx: ExecuteContext) {
    if (isUndefined(ctx.updatedDeps) && !ctx.forceUpdate) {
      return;
    }
    await this.executeAll(ctx);
	}

  async executeAll(ctx: ExecuteContext) {
    console.log('filename: ', __filename);
    const beginTime = performance.now();
    const tasks = this.tasks.map(name => this.__executeTask(name, ctx));
    const tuples = await Promise.all(tasks);
    const endTime = performance.now();
    const delta = Math.round(endTime - beginTime);
    console.log(`Action ${green(ParallelExecutor.actionName)} done in ${delta}ms!`);
    for (const [taskName, out] of tuples) {
      console.log(`Output of ${green(taskName)}:`);
      console.log(out);
    }
  }

  /**
   * fork self to execute task
   */
  private async __executeTask(taskName: string, ctx: ExecuteContext): Promise<[string, string]> {
    console.log(`Spwaning task ${green(taskName)}`);
    const { workDir } = ctx;
    const args: string[] = [
      'build',
      workDir,
      '-t',
      taskName,
      '-f',
      '--no-conclusion',
    ];

    const stdout = await forkAsync(__filename, args, {
      stdio: 'pipe',
    });

    return [taskName, stdout];
  }

	public getParams(): string[] {
		return this.tasks;
	}

	public getDeps(): string[] {
		return this.tasks.map(makeTaskDep);
	}

}

registerAction(ParallelExecutor);
