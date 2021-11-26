import { ActionExecutor, registerAction, ExecuteContext } from './common';
import { fork, ForkOptions } from 'child_process';
import { green } from 'chalk';
import BufferList from 'bl';
import logger from '../logger';

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
		await this.__executeAll(ctx);
	}

	private async __executeAll(ctx: ExecuteContext) {
		const tasks = this.tasks.map(name => this.__executeTask(name, ctx));
		const tuples = await Promise.all(tasks);
		for (const [taskName, out] of tuples) {
			// no output or all of them are whitespaces, ignore them
			if (out.length === 0 || /\s+/.test(out)) {
				console.log(`continue of ${out}`);
				continue;
			}
			const obj = JSON.parse(out);
			logger.mergesOutput(obj);
		}
	}

	/**
	 * fork self to execute task
	 */
	private async __executeTask(taskName: string, ctx: ExecuteContext): Promise<[string, string]> {
		logger.printIfReadable(`Spwaning task ${green(taskName)}`);
		const { workDir } = ctx;
		const args: string[] = [
			'build',
			workDir,
			'-t',
			taskName,
			'--log json',
		];

		const stdout = await forkAsync(__filename, args, {
			stdio: 'pipe',
		});

		return [taskName, stdout];
	}

	public getParams(): string[] {
		return this.tasks;
	}

	/**
	 * This is saying, this task will be execute everytime
	 */
	public getDeps(): '*' {
		return '*';
	}

}

registerAction(ParallelExecutor);
