import { isString, isObjectLike, isUndefined, maxBy } from 'lodash-es';
import { performance } from 'perf_hooks';
import { grey, cyan } from 'chalk';
import type { ProductWithSize } from './product';

export enum LogMode {
  Readable = 0,
  Data,
}

export interface ErrorLog {
  message: string;
}

function oneFloatingPoint(n: number) {
  return Math.round(n * 10) / 10;
}

function friendlySize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}bytes`;
  } else if (bytes < 1024 * 1024) {
    return `${oneFloatingPoint(bytes / 1024)}kb`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${oneFloatingPoint(bytes / (1024 * 1024))}mb`;
  } else {
    return `${oneFloatingPoint(bytes / (1024 * 1024 * 1024))}gb`;
  }
}

export type ExitCallback = (exitCode: number) => void;

const MAX_PRINT_OUTPUT_SIZE = 10;

function prettyPrint(errors: ErrorLog[], updatedYmlFiles: string[], output: ProductWithSize[], taskCounter: number, delta: number) {
  if (errors.length > 0) {
    for (const err of errors) {
      console.log(err.message);
    }
    return;
  }

  if (updatedYmlFiles.length > 0) {
    console.log();
    console.log(`These YML files have changed due to the dependencies:`);
    for (const f of updatedYmlFiles) {
      console.log(` - ${grey(f)}`)
    }
  }

  console.log();
  if (output.length === 0) {
    console.log('\ud83c\udf1e Everything is up to date.');
    console.log()
  } else {
    output.sort((a, b) => a.size - b.size);
    console.log(`${output.length} files generated.`);
    const maxLenFilename = maxBy(output, o => o.file.length);
    let counter = 0;
    for (const { file, size } of output) {
      if (counter++ >= MAX_PRINT_OUTPUT_SIZE) {
        console.log(grey('...'));
        console.log(`${output.length - counter + 1} files are hidden.`)
        break;
      }
      console.log(`${grey(file.padEnd(maxLenFilename.file.length + 4))}${cyan(friendlySize(size))}`);
    }
    console.log();
  }

  console.log(`Totally ${taskCounter} tasks is executed in ${Math.round(delta)}ms.`);
}

export interface PrintOptions {
  exitCode?: number;
  ignoreYmlFiles?: boolean,
}

/**
 * Only the main process print readable log to stdout.
 * 
 * But the child process needs to return some informations
 * to the main process.
 */
export class Logger {

  public mode: LogMode = LogMode.Readable;
  private __output: ProductWithSize[] = [];
  private __errors: ErrorLog[] = [];
  private __updatedYmlFiles: string[] = [];
  private __beginTime: number;
  private __endTime: number;
  private __taskCounter: number = 0;
  private __exit: ExitCallback = (exitCode: number) => {
    process.exit(exitCode);
  }

  constructor() {
    this.__endTime = this.__beginTime = performance.now();
  }

  public addUpdatedYml(path: string) {
    this.__updatedYmlFiles.push(path);
  }

  public printAndExit(options?: PrintOptions) {
    let exitCode = 0;
    if (options && options.exitCode) {
      exitCode = options.exitCode;
    }

    if (options && options.ignoreYmlFiles) {
      this.__updatedYmlFiles.length = 0;
    }

    this.__endTime = performance.now();
    const delta = this.__endTime - this.__beginTime;
    if (this.mode === LogMode.Readable) {
      this.__prettyPrint(delta);
    } else {
      const data = {
        outputs: this.__output,
        delta,
        taskCount: this.__taskCounter,
        updatedYmlFiles: this.__updatedYmlFiles,
        errors: this.__errors,
      };
      try {
        process.send(data);
      } catch (err) {
        console.error(data);
      }
    }

    this.__exit(exitCode);
  }

  public registerExitCallback(callback: ExitCallback) {
    this.__exit = callback;
  }

  public mergesOutput(objs: any) {
    if (!isObjectLike(objs)) {
      return;
    }
    const outputs = objs.outputs || [];
    for (const o of outputs) {
      this.__output.push(o);
    }
    const taskCount = objs.taskCount || 0;
    this.__taskCounter += taskCount;

    const updatedYmlFiles = objs.updatedYmlFiles || [];
    for (const f of updatedYmlFiles) {
      this.__updatedYmlFiles.push(f);
    }

    const errors = objs.errors || [];
    for (const e of errors) {
      this.__errors.push(e);
    }
  }

  public prettyPrintOutput(objs: any, delta: number) {
    if (!isObjectLike(objs)) {
      return;
    }
    const outputs = objs.outputs || [];
    const taskCount = objs.taskCount || 0;
    const updatedYmlFiles = objs.updatedYmlFiles || [];
    const errors = objs.errors || [];
    prettyPrint(errors, updatedYmlFiles, outputs, taskCount, delta);
  }

  public error(error: ErrorLog | string) {
    if (isString(error)) {
      error = {
        message: error,
      };
    }
    this.__errors.push(error);
  }

  public panic(error: ErrorLog | string) {
    this.error(error);
    this.printAndExit({ exitCode: 1 });
  }

  private __prettyPrint(delta: number) {
    prettyPrint(
      this.__errors,
      this.__updatedYmlFiles,
      this.__output,
      this.__taskCounter,
      delta
    );
  }

  public printIfReadable(content?: string) {
    if (this.mode !== LogMode.Readable) {
      return;
    }
    if (isUndefined(content)) {
      console.log();
    } else {
      console.log(content);
    }
  }

  public addOutput(output: ProductWithSize) {
    this.__output.push(output);
  }

  public plusTaskCounter() {
    this.__taskCounter++;
  }

}

export default new Logger();
