// This script help loading build script from user

import * as fs from 'fs';
import * as path from 'path';
import {
  build as esbuild,
  BuildOptions as EsBuildOptions,
  BuildResult as EsBuildResult,
} from 'esbuild';
import { DependencyBuilder, Dependencies } from './dependency';
import { isUndefined, isFunction, isArray, isString } from 'lodash-es';
import registry, { RegistryContext, ActionExecutorGenerator, ActionResult } from './registry';
import { ActionExecutor, ExecutionContext } from './actions';
import { ProductBuilder } from './product';
import { BuildGraph, TaskNode, ActionStore, makeTaskNode } from './buildGraph';
import { runActionOfTask } from './build';
import { Stage } from './flags';
import logger from './logger';

function findProjectPath(): string | undefined {
  let currentDir = process.cwd();
  let packageJsonPath = path.join(currentDir, 'package.json');

  while (!fs.existsSync(packageJsonPath)) {
    const tmp = path.resolve(currentDir, '..');
    if (tmp === currentDir) {  // it's the end
      return undefined;
    }
    packageJsonPath = path.join(currentDir, 'package.json');
  }

  return currentDir;
}

const ALLOW_FILENAMES = [
  'yesbuild.config.js',
  'yesbuild.config.mjs',
  'yesbuild.config.ts',
];

function findBuildScriptPath(): string | undefined {
  const projectPath = findProjectPath();
  if (isUndefined(projectPath)) {
    return undefined;
  }

  for (const filename of ALLOW_FILENAMES) {
    const expectedFilename = path.join(projectPath, filename);
    if (fs.existsSync(expectedFilename)) {
      return expectedFilename;
    }
  }

  return undefined;
}

async function bundleBuildScript(entry: string, depBuilder?: DependencyBuilder): Promise<string> {
  const outfile = entry + '.js';
  const collectDeps = !isUndefined(depBuilder);
  const esBuildOptions: EsBuildOptions = {
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    outfile,
    logLevel: 'error',
    splitting: false,
    sourcemap: 'inline',
    platform: 'node',
    metafile: true,
    plugins: [],
    external: [
      'esbuild',
      'yesbuild',
      '@yesbuild/typescript',
      './dist'
    ],
  };

  const buildResult = await esbuild(esBuildOptions);
  if (collectDeps) {
    collectDependenciesByBuildResult(buildResult, depBuilder!);
  }
  return outfile;
}

function collectDependenciesByBuildResult(result: EsBuildResult, depBuilder: DependencyBuilder) {
  if (isUndefined(result.metafile)) {
    return;
  }
  const { outputs } = result.metafile;
  for (const key in outputs) {
    const output = outputs[key];
    for (const dep of Object.keys(output.inputs)) {
      depBuilder.dependFile(dep);
    }
  }
}

export interface BuildScriptContext {
  path: string;
  registry: RegistryContext;
  deps: Dependencies;
}

export function loadBuildScript(): Promise<BuildScriptContext> {
  const buildScriptPath = findBuildScriptPath();
  if (isUndefined(buildScriptPath)) {
    logger.printIfReadable('No build script found.');
    return;
  }

  return loadScriptAsProfile(buildScriptPath);
}

async function loadScriptAsProfile(path: string): Promise<BuildScriptContext> {
  const depBuilder: DependencyBuilder = new DependencyBuilder();
  const scriptPath = await bundleBuildScript(path, depBuilder);
  require(scriptPath);
  fs.unlinkSync(scriptPath);
  const registryContext = registry.takeContext();
  // return new Profile(path, registryContext, depBuilder.finalize());
  return {
    path,
    registry: registryContext,
    deps: depBuilder.finalize(),
  };
}

interface TaskCollectorContinuation {
  generator: ActionExecutorGenerator;
  lastResult?: ActionResult;
}

let runningTaskRunner: ScriptTaskRunner | undefined = undefined;

class ScriptTaskRunner {

  private __continuation: TaskCollectorContinuation | undefined = undefined;
  private __depsBuilder: DependencyBuilder = new DependencyBuilder();
  private __productsBuilder: ProductBuilder = new ProductBuilder();
  private __taskDir: string;

  public constructor(
    private runner: ScriptRunner,
    private taskName: string,
    private taskNode: TaskNode,
  ) {
    const { buildDir } = runner;
    this.__taskDir = path.join(buildDir, this.taskName);
    runningTaskRunner = this;
  }

  get taskDir() {
    return this.__taskDir;
  }

  public async run() {
    const task = this.runner.registry.tasks.get(this.taskName);
    if (!task) {
      throw new Error(`Collecting depencencies failed: task '${this.taskName}' not found`);
    }

    // call the user method to collect deps
    const actionExecutor = task.userCallback();
    if (actionExecutor instanceof ActionExecutor) {
      await this.__testActionExecutor(actionExecutor);
      this.finalize();
    } else if (actionExecutor && isFunction(actionExecutor.next)) {
      this.__continuation = {
        generator: actionExecutor,
      };
      return this.__testActionExecutorGenerator(actionExecutor);
    }

  }

  private addDeps(deps: Dependencies) {
    if (deps === '*') {
      this.__depsBuilder.addDep(deps);
    } else if (isArray(deps)) {
      for (const d of deps) {
        this.__depsBuilder.addDep(d);
      }
    }
  }

  private finalize() {
    logger.plusTaskCounter();
    this.taskNode.deps = this.__depsBuilder.finalize();
    const products = this.__productsBuilder.finalize();
    this.taskNode.products = products.map(o => o.file);
    this.runner.resultPool.set(
      this.taskName,
      { products });
  }

  private async __testActionExecutor(executor: ActionExecutor): Promise<ActionResult | undefined> {
    const { props } = executor;
    const store: ActionStore = {
      name: (executor.constructor as any).actionName,
      props,
    }
    if (store.name === 'anotherTask') {
      return this.__yieldResultOfAnotherTask(props,  store);
    }

    this.taskNode.actions.push(store);

    const { buildDir } = this.runner;

    const executeContext: ExecutionContext = {
      stage: Stage.Configure,
      buildDir,
      depsBuilder: this.__depsBuilder,
      productsBuilder: this.__productsBuilder,
      taskDir: path.join(buildDir, this.taskName),
      forceUpdate: false,
    };
    await runActionOfTask(executeContext, this.taskName, store);
    return { products: this.__productsBuilder.finalize() };
  }

  private async __yieldResultOfAnotherTask(anotherTaskName: string, store: ActionStore): Promise<ActionResult | undefined> {
    if (!isString(anotherTaskName)) {
      return undefined;
    }
    const anotherTaskNode = this.runner.resultPool.get(anotherTaskName);
    if (!anotherTaskNode) {
      return undefined;
    }

    const { buildDir } = this.runner;

    const executeContext: ExecutionContext = {
      stage: Stage.Configure,
      buildDir,
      depsBuilder: this.__depsBuilder,
      productsBuilder: this.__productsBuilder,
      taskDir: path.join(buildDir, this.taskName),
      forceUpdate: false,
    };
    await runActionOfTask(executeContext, this.taskName, store);

    return anotherTaskNode;
  }

  private async __testActionExecutorGenerator(generator: ActionExecutorGenerator): Promise<void> {
    const { lastResult } = this.__continuation;

    // call user's generator and pass last result
    const next = generator.next(lastResult);

    if (next.value instanceof ActionExecutor) {
      const lastResult = await this.__testActionExecutor(next.value);
      this.addDeps(this.taskNode.deps);
      this.__continuation.lastResult = lastResult;
    }

    if (next.done) {
      this.finalize();
    } else {
      this.__testActionExecutorGenerator(generator);
    }
  }

}

/**
 * This class is designed to run the generator
 * to collect the dependencies
 */
class ScriptRunner {

  public readonly resultPool: Map<string, ActionResult> = new Map();

  public constructor(
    public readonly graph: BuildGraph,
    public readonly registry: RegistryContext,
    public readonly buildDir: string,
  ) { }

  public run(): Promise<void> {
    return this.__executeAllTasks();
  }

  private async __executeAllTasks(): Promise<void> {
    for (const [key] of this.registry.tasks) {
      await this.__executeTaskToCollectDeps(key);
    }
  }

  /**
   * Set a global dependency collector to collects dependencies
   */
  private __executeTaskToCollectDeps(taskName: string): Promise<void> {
    const taskNode = this.graph.getOrNewTaskNode(taskName);
    const taskRunner = new ScriptTaskRunner(this, taskName, taskNode);
    return taskRunner.run();
  }

}

export function executeTaskToCollectDeps(graph: BuildGraph, registry: RegistryContext, buildDir: string): Promise<void> {
  const taskRunner = new ScriptRunner(graph, registry, buildDir);
  return taskRunner.run();
}

export { runningTaskRunner }
