import chokidar from 'chokidar';
import { resolve } from 'path';
import { green, grey, red } from 'chalk';
import { fork, ChildProcess } from 'child_process';
import { isUndefined, debounce, isArray } from 'lodash-es';
import { performance } from 'perf_hooks';
import { BuildGraph } from './buildGraph';
import logger from './logger';

export type WatchFinishedCallback = () => any;

class AsyncTask {

  private __process: ChildProcess | undefined = undefined;
  public __beginTime: number;

  /// AsyncTask is a linked-list
  public next: AsyncTask | undefined = undefined;

  public constructor(
    public taskName: string,
    private buildDir: string,
  ) {
  }

  public run(): ChildProcess {
    this.__beginTime = performance.now();
    logger.printIfReadable(`Spwaning task ${green(this.taskName)}`);

    const args: string[] = [
      'build',
      this.buildDir,
      '-t',
      this.taskName,
			'--ignore-meta',
      '--log',
      'json',
    ];

    this.__process = fork(__filename, args);
    return this.__process;
  }

  public kill() {
    if (isUndefined(this.__process)) {
      return;
    }
    this.next = undefined;  // clear the linked-list
    this.__process.kill();
  }

  get beginTime() {
    return this.__beginTime;
  }

}

class WatchContext {

  // path => tasknames
  private __fileDeps: Map<string, string[]> = new Map();
  private __prevTask: AsyncTask | undefined = undefined;

  public constructor(
    public readonly graph: BuildGraph,
    public readonly buildDir: string,
    public readonly taskNames: string[],
    private finished?: WatchFinishedCallback[],
  ) {}

  public collectFileDepsByEntries() {
    for (const taskName of this.taskNames) {
      const fileDeps = this.graph.collectAllFilesDeps(taskName);
      for (const filename of fileDeps) {
        let mappedNames: string[] | undefined = this.__fileDeps.get(filename)
        if (!mappedNames) {
          mappedNames = [];
          this.__fileDeps.set(filename, mappedNames);
        }
        mappedNames.push(taskName);
      }
    }
  }

  public testDep(filename: string): string[] | undefined {
    return this.__fileDeps.get(filename);
  }

  private __killPreviousProcess() {
    if (isUndefined(this.__prevTask)) {
      return;
    }
    console.log(`Previous build ${red(this.__prevTask.taskName)} hasn't finished, kill it`);
    this.__prevTask.kill();
    this.__prevTask = undefined;
  }

  /// Thoughts:
  /// Maybe spawning a new process is a good choice.
  /// assuming the build process will take along time.
  ///
  /// While the next task comming, we chan just kill tht last process
  /// to stop the last build.
  ///
  /// Once using another proecess to rebuild, the buildGrapth
  /// may be out of date, so read from files again
  public rebuildTask(taskNames: string[]) {
    this.__killPreviousProcess();

    let prevAsyncTask: AsyncTask;
    for (let i = 0; i < taskNames.length; i++) {
      const taskName = taskNames[i];
      const asyncTask = new AsyncTask(taskName, this.buildDir);

      if (i === 0) {
        this.__runTask(asyncTask);
      } else {
        prevAsyncTask.next = asyncTask;
      }

      prevAsyncTask = asyncTask;
    }
  }

  private __runTask(asyncTask: AsyncTask) {
    const proc = asyncTask.run();
    proc.on('message', this.__handleMessage(asyncTask));
    proc.on('close', this.__handleChildFinished(asyncTask))
    this.__prevTask = asyncTask;
  }

  private __handleMessage = (task: AsyncTask) => (msg: any) => {
    const endTime = performance.now();
    logger.prettyPrintOutput(msg, endTime - task.beginTime);
  }

  private __handleChildFinished = (task: AsyncTask) => () => {
    if (this.__prevTask === task) {
      this.__prevTask = undefined;
    }

    this.graph.forceReloadTask(task.taskName);

    if (task.next) {
      this.__runTask(task.next);
    } else {
      this.__emitAllCallbacks();
    }
  }

  private __emitAllCallbacks() {
    if (!isArray(this.finished)) {
      return;
    }

    for (const cb of this.finished) {
      cb();
    }
  }

}

export interface WatchOptions {
  buildDir: string;
  taskNames: string[],
  finished?: WatchFinishedCallback[],
}

export function watch(options: WatchOptions) {
  const { buildDir, taskNames, finished } = options;
  const graph = new BuildGraph(buildDir);
  const context = new WatchContext(graph, buildDir, taskNames, finished);

  for (const taskName of taskNames) {
    const taskNode = graph.loadTask(taskName);
    if (taskNode.deps === '*') {
      logger.panic(`The dependencies of ${green(taskName)} is '*', can not watch`);
      return;
    }
  }

  // traverse graph to get deps
  context.collectFileDepsByEntries();

  return __startWatcher(context, options);
}

function __startWatcher(ctx: WatchContext, options: WatchOptions) {
  const watcher = chokidar.watch('.', {
    ignored: [
      'node_modules/**',
      options.buildDir + '/**',
    ],
    persistent: true,
  });

  watcher.on('ready', () => {
    console.log(`Watching ${green(resolve('.'))}...`)
  });

  const rebuildTask = debounce((taskNames: string[]) => ctx.rebuildTask(taskNames), 300);

  watcher.on('change', (path) => {
    const testResult = ctx.testDep(path);
    if (isUndefined(testResult)) {
      return;
    }
    console.log(`Dependency of ${green(testResult.join(', '))} changed: ${grey(path)}`);
    rebuildTask(testResult);
  });
}
