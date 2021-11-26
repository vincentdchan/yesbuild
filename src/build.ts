import { join } from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { isString, max } from 'lodash-es';
import { green, red } from 'chalk';
import { testFileDep } from './dependency';
import { TaskNode, BuildGraph } from './buildGraph';
import { getAction, ExecuteContext } from './actions';

export interface BuildOptions {
	buildDir: string,
  task: string,
	forceUpdate?: boolean,
}

export async function build(options: BuildOptions) {
	const { buildDir, task: taskName, forceUpdate } = options;
	const ymlPath = join(buildDir, 'yesbuild.yml');
	if (!fs.existsSync(ymlPath)) {
		throw new Error(`yesbuild.yml not found in ${ymlPath}`);
	}

	const content = await fs.promises.readFile(ymlPath, 'utf-8');
	const objs: any = yaml.load(content);
	const graph = BuildGraph.fromJSON(objs);

	const taskOptions: RunTaskOptions = {
		forceUpdate: Boolean(forceUpdate),
		ymlPath,
		workDir: buildDir,
	}

  if (taskName === '*') {
    await runAllTasks(graph, taskOptions);
  } else {
    const task = graph.tasks.get(taskName);
    if (!task) {
      console.log(`Task ${red(taskName)} not found!`);
      process.exit(1);
    }
    await runTask(task, taskName, taskOptions);
  }
}

export interface RunTaskOptions {
	forceUpdate?: boolean;
	ymlPath: string;
	workDir: string;
}

export async function runAllTasks(graph: BuildGraph, options: RunTaskOptions) {
  for (const [name, task] of graph.tasks) {
    await runTask(task, name, options);
  }
}

async function runTask(task: TaskNode, taskName: string, options: RunTaskOptions) {
  console.log(`Running task: ${green(taskName)}`);
  const updatedEntries: string[] = [];
  let { forceUpdate } = options;

	if (!forceUpdate) {
		try {
			checkDependenciesUpdate(task, updatedEntries);
		} catch (err) {
			console.info('Error occurs, force rebuild');
			forceUpdate = true;
		}
	}

	const { workDir: buildDir } = options;

  if (updatedEntries.length > 0 || forceUpdate) {
    await rebuild(taskName, task, buildDir, updatedEntries);
  } else {
    console.log('Everything is update to date.');
  }
}

function findLatestTimeOfOutput(task: TaskNode): number {
	const times: number[] = [];

	for (const output of task.outputs) {
		const stat = fs.statSync(output);
		const { mtimeMs } = stat;
		times.push(mtimeMs);
	}

	return max(times);
}

function checkDependenciesUpdate(task: TaskNode, updatedEntries: string[]) {
  // TODO: check deps
	const targetMtime = findLatestTimeOfOutput(task);

	for (const depLiteral of task.deps) {
    let testResult = testFileDep(depLiteral);
    if (isString(testResult)) {
      const stat = fs.statSync(testResult);
      const { mtimeMs } = stat;
      if (mtimeMs > targetMtime) {
        updatedEntries.push(testResult);
      }
    } else {
      throw new Error(`Get a new type of depencency: ${depLiteral}, not support yet`);
    }
	}
}

async function rebuild(taskName: string, taskNode: TaskNode, buildDir: string, updatedEntries: string[]) {
	if (updatedEntries.length > 0) {
		console.log(`Rebuild action ${green(taskName)} because of these dependencies changed:`)
		for (const entry of updatedEntries) {
			console.log(`  - ${entry}`);
		}
	}

	const executeContext: ExecuteContext = Object.freeze({
		workDir: buildDir,
		updatedDeps: updatedEntries,
	});

	for (const rawAction of taskNode.actions) {
		const { name, params } = rawAction;
		const actionCtor = getAction(name);
		if (!actionCtor) {
			console.log(`Unreconized action ${red(name)}, can not rebuild.`);
			process.exit(1);
		}

		const action = new actionCtor(params);
		await action.execute(executeContext);

		const outputs = action.getOutputs();
		const deps = action.getDeps();
		taskNode.deps = deps;
		taskNode.outputs = outputs;
	}
}
