import * as fs from 'fs';
import chokidar from 'chokidar';
import { resolve } from 'path';
import { green, grey, cyan, red } from 'chalk';
import { fork, ChildProcess } from 'child_process';
import { isUndefined, debounce } from 'lodash-es';
import { performance } from 'perf_hooks';
import { makeTaskYmlFilename, BuildGraph } from './buildGraph';
import logger from './logger';

class WatchContext {

  private __fileDeps: Set<string>;
  private __prevProcess: ChildProcess | undefined = undefined;
  private __ymlPath: string;

  public constructor(
    public readonly graph: BuildGraph,
    public readonly buildDir: string,
    public readonly taskName: string,
  ) {
    this.__ymlPath = makeTaskYmlFilename(buildDir, taskName);
    if (!fs.existsSync(this.__ymlPath)) {
      logger.panic(`Error: ${cyan(this.__ymlPath)} not exists, task ${green(taskName)} can not build.
  Is the directory ${grey(resolve(buildDir))} correct?`);
    }

    this.partialReloadGraphFromYml();
  }

  public collectFileDepsByEntry(entry: string) {
    const fileDeps = this.graph.collectAllFilesDeps(entry);
    this.__fileDeps = new Set(fileDeps);
  }

  public isDep(filename: string): boolean {
    return this.__fileDeps.has(filename);
  }

  private __killPreviousProcess() {
    if (isUndefined(this.__prevProcess)) {
      return;
    }
    console.log(`Previous build ${red(this.taskName)} hasn't finished, kill it`);
    this.__prevProcess.kill();
    this.__prevProcess = undefined;
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
  public rebuildTask() {
    this.__killPreviousProcess();
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

    const beginTime = performance.now();
    const child = fork(__filename, args)

    child.on('message', this.__handleMessage(beginTime));
    child.on('close', this.__handleChildFinished(child));

    this.__prevProcess = child;
  }

  private __handleMessage = (beginTime: number) => (msg: any) => {
    const endTime = performance.now();
    logger.prettyPrintOutput(msg, endTime - beginTime);
  }

  private __handleChildFinished = (child: ChildProcess) => () => {
    if (this.__prevProcess === child) {
      this.__prevProcess = undefined;
    }
    this.partialReloadGraphFromYml();
  }

  public partialReloadGraphFromYml() {
    this.graph.loadPartialFromYml(this.__ymlPath);
  }

}

export interface WatchOptions {
  buildDir: string;
  taskName: string,
}

export function watch(options: WatchOptions) {
  const { buildDir, taskName } = options;
  const graph = new BuildGraph();
  const context = new WatchContext(graph, buildDir, taskName);

  const taskNode = graph.tasks.get(taskName);
  if (taskNode.deps === '*') {
    logger.panic(`The dependencies of ${green(taskName)} is '*', can not watch`);
    return;
  }

  // traverse graph to get deps
  context.collectFileDepsByEntry(taskName);

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

  const rebuildTask = debounce(() => ctx.rebuildTask(), 300);

  watcher.on('change', (path) => {
    const isDep = ctx.isDep(path);
    if (isDep) {
      console.log(`Dependency of ${green(ctx.taskName)} changed: ${grey(path)}`);
      rebuildTask();
    }
  });
}
