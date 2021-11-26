import { isString } from 'lodash-es';
import { performance } from 'perf_hooks';

export enum LogMode {
	Readable = 0,
	Data,
}

export interface OutputLog {
	file: string,
	size: number,
}

export interface ErrorLog {
	message: string;
}

/**
 * Only the main process print readable log to stdout.
 * 
 * But the child process needs to return some informations
 * to the main process.
 */
export class Logger {

	public mode: LogMode = LogMode.Readable;
	private __output: OutputLog[] = [];
	private __errors: ErrorLog[] = [];
	private __beginTime: number;
	private __endTime: number;
	private __taskCounter: number = 0;

	constructor() {
		this.__endTime = this.__beginTime = performance.now();
	}

	public printAndExit(exitCode: number = 0) {
		this.__endTime = performance.now();
		const delta = this.__endTime - this.__beginTime;
		if (this.mode === LogMode.Readable) {
			return this.__prettyPrint(delta);
		}

		console.log(JSON.stringify({
			outputs: this.__output,
			delta,
			taskCount: this.__taskCounter,
		}));

		process.exit(exitCode);
	}

	public panic(error: ErrorLog | string) {
		if (isString(error)) {
			error = {
				message: error,
			};
		}
		this.__errors.push(error);
		this.printAndExit(1);
	}

	private __prettyPrint(delta: number) {
		if (this.__output.length === 0) {
			console.log();
			console.log('\ud83c\udf1e Everything is up to date.');
			console.log();
			return;
		}

		console.log(`Totally ${this.__taskCounter} tasks is executed in ${Math.round(delta)}ms`);
	}

	public printIfReadable(content: string) {
		if (this.mode !== LogMode.Readable) {
			return;
		}
		console.log(content);
	}

	public addOutput(output: OutputLog) {
		this.__output.push(output);
	}

	public plusTaskCounter() {
		this.__taskCounter++;
	}

}

export default new Logger();
