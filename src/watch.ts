import * as fs from 'fs';
import chokidar from 'chokidar';
import { resolve } from 'path';
import { green, grey, cyan } from 'chalk';
import { makeTaskYmlFilename, BuildGraph } from './buildGraph';
import logger from './logger';

class WatchContext {

  private __fileDeps: Set<string>;

  public constructor(
    public readonly graph: BuildGraph,
    public readonly taskName: string,
  ) {}

  public collectFileDepsByEntry(entry: string) {
    const fileDeps = this.graph.collectAllFilesDeps(entry);
    this.__fileDeps = new Set(fileDeps);
  }

  public isDep(filename: string): boolean {
    return this.__fileDeps.has(filename);
  }

  // Thoughts:
  // Maybe spawn a new process to build would be better.
  // assuming the build process will take along time.
  //
  // While the next task comming, we chan just kill tht last process
  // to stop the last build.
  public async rebuildTask() {

  }

}

export interface WatchOptions {
  buildDir: string;
  taskName: string,
}

export function watch(options: WatchOptions) {
  const { buildDir, taskName } = options;
  const ymlPath = makeTaskYmlFilename(buildDir, taskName);
  if (!fs.existsSync(ymlPath)) {
    logger.panic(`Error: ${cyan(ymlPath)} not exists, task ${green(taskName)} can not build.
Is the directory ${grey(resolve(buildDir))} correct?`);
    return;
  }

  const graph = BuildGraph.loadPartialFromYml(ymlPath);
  const context = new WatchContext(graph, taskName);

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

  watcher.on('change', (path) => {
    const isDep = ctx.isDep(path);
    if (isDep) {
      console.log(`Dependency of ${green(ctx.taskName)} changed: ${grey(path)}`);
      ctx.rebuildTask();
    }
  });
}
