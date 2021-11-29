// This script help loading build script from user

import * as fs from 'fs';
import * as path from 'path';
import {
	build as esbuild,
	BuildOptions as EsBuildOptions,
	BuildResult as EsBuildResult,
} from 'esbuild';
import { DependencyBuilder, Dependencies } from './dependency';
import { isUndefined, isFunction, isArray } from 'lodash-es';
import registry, { RegistryContext, ActionExecutorGenerator, ActionResult } from './registry';
import { ActionExecutor, ExecutionContext } from './actions';
import { OutputBuilder } from './output';
import { BuildGraph, TaskNode, ActionStore, makeTaskNode } from './buildGraph';
import { runActionOfTask } from './build';
import { Stage } from './flags';
import logger  from './logger';

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

function findBuildScriptPath(): string | undefined {
	const projectPath = findProjectPath();
	if (isUndefined(projectPath)) {
		return undefined;
	}

	let expectedFilename: string;
	expectedFilename = path.join(projectPath, 'yesbuild.config.js');
	if (fs.existsSync(expectedFilename)) {
		return expectedFilename;
	}

	expectedFilename = path.join(projectPath, 'yesbuild.config.mjs');
	if (fs.existsSync(expectedFilename)) {
		return expectedFilename;
	}

	expectedFilename = path.join(projectPath, 'yesbuild.config.ts');
	if (fs.existsSync(expectedFilename)) {
		return expectedFilename;
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
		external: ['esbuild', 'yesbuild', './dist'],
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

function getOrNewTaskNode(graph: BuildGraph, taskName: string): TaskNode {
  let taskNode = graph.tasks.get(taskName);
  if (!taskNode) {
    taskNode = makeTaskNode();
    graph.tasks.set(taskName, taskNode);
  }

  return taskNode;
}

interface TaskCollectorContinuation {
  generator: ActionExecutorGenerator;
  lastResult?: ActionResult;
}


class ScriptTaskRunner {

  private __continuation: TaskCollectorContinuation | undefined = undefined;
  private __depsBuilder: DependencyBuilder = new DependencyBuilder();
  private __outputsBuilder: OutputBuilder = new OutputBuilder();
  private __taskDir: string;

  public constructor(
    private graph: BuildGraph,
    private registry: RegistryContext,
    private buildDir: string,
    private taskName: string,
    private taskNode: TaskNode,
  ) {
    this.__taskDir = path.join(this.buildDir, this.taskName);
  }

  get taskDir() {
    return this.__taskDir;
  }

  public async run() {
    const task = this.registry.tasks.get(this.taskName);
    if (!task) {
      throw new Error(`Collecting depencencies failed: task '${this.taskName}' not found`);
    }

    // call the user method to collect deps
    const actionExecutor = task.userCallback();
    if (actionExecutor instanceof ActionExecutor) {
      await this.__testActionExecutor(actionExecutor);
      this.finalize();
    } else if (actionExecutor && isFunction(actionExecutor.next)) {
      this.__continuation= {
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
    this.taskNode.outputs = this.__outputsBuilder.finalize().map(o => o.file);
  }

  private __testActionExecutor(executor: ActionExecutor): Promise<void> {
    const params = executor.getParams();
    const store: ActionStore = {
      name: (executor.constructor as any).actionName,
      params,
    }
    const actionIndex = this.taskNode.actions.length;
    this.taskNode.actions.push(store);

    const { buildDir } = this;

    const executeContext: ExecutionContext = {
      stage: Stage.Configure,
      buildDir,
      depsBuilder: this.__depsBuilder,
      outputBuilder: this.__outputsBuilder,
      taskDir: path.join(buildDir, this.taskName),
      forceUpdate: false,
    };
    return runActionOfTask(executeContext, this.taskName, this.taskNode, actionIndex);
  }

  private async __testActionExecutorGenerator(generator: ActionExecutorGenerator): Promise<void> {
    const { lastResult } = this.__continuation;
    const next = generator.next(lastResult);

    if (next.value instanceof ActionExecutor) {
      await this.__testActionExecutor(next.value);
      this.addDeps(this.taskNode.deps);
      this.__continuation.lastResult = {
        outputs: this.__outputsBuilder.finalize(),
      };
    }

    if (next.done) {
      this.finalize();
    } else {
      this.__testActionExecutorGenerator(generator);
    }
  }

}

export let runningTaskRunner: ScriptTaskRunner | undefined = undefined;

/**
 * This class is designed to run the generator
 * to collect the dependencies
 */
class ScriptRunner {

  public constructor(
    private graph: BuildGraph,
    private registry: RegistryContext,
    private buildDir: string,
  ) {}

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
    const taskNode = getOrNewTaskNode(this.graph, taskName);
    const taskRunner = new ScriptTaskRunner(this.graph, this.registry, this.buildDir, taskName, taskNode);
    return taskRunner.run();
  }

}

export function executeTaskToCollectDeps(graph: BuildGraph, registry: RegistryContext, buildDir: string): Promise<void> {
	const taskRunner = new ScriptRunner(graph, registry, buildDir);
  return taskRunner.run();
}
