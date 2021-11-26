import { isObjectLike, isString, max } from 'lodash-es';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { testFileDep, testTaskDep } from './dependency';

const YML_VERSION = '1.0';

export interface ActionStore {
  name: string,
  params?: any;
}

interface StaticPoolMap {
  [path: string]: any;
}

export interface TaskOutput {
  deps: string[];
}

export function makeTaskOutput(): TaskOutput {
  return {
    deps: [],
  };
}

export interface TaskNode {
  actions: ActionStore[],
  outputs: string[];
  deps: string[];
}

export function makeTaskNode(): TaskNode {
  return {
    actions: [],
    outputs: Object.create(null),
    deps: [],
  };
}

/**
 * Collect dependencies and divides them
 * into groups.
 * 
 * Yesbuild needs to know what task
 * depends on this dependency.
 */
class DependenciesCollector {

  public readonly fileDeps: Map<string, string[]> = new Map();
  public readonly taskDeps: Map<string, string[]> = new Map();
  public readonly taskNamesToUpdate: Set<string> = new Set();

  public constructor() {}
  
  public pushFileDepForTask(taskName: string, content: string) {
    let sources: string[] = this.fileDeps.get(content);
    if (!sources) {
      sources = [];
      this.fileDeps.set(taskName, sources);
    }

    sources.push(taskName);
  }

  public pushTaskDepForTask(taskName: string, content: string) {
    let sources: string[] = this.taskDeps.get(content);
    if (!sources) {
      sources = [];
      this.taskDeps.set(taskName, sources);
    }

    sources.push(taskName);
  }

  public isTaskCollected(taskName: string): boolean {
    return Boolean(this.taskDeps.get(taskName));
  }

  public addTaskNamesToUpdate(taskNames: string[]) {
    for (const taskName of taskNames) {
      this.taskNamesToUpdate.add(taskName);
    }
  }

}

function findLatestTimeOfOutput(outputs: string[]): number {
	const times: number[] = [];

	for (const output of outputs) {
		const stat = fs.statSync(output);
		const { mtimeMs } = stat;
		times.push(mtimeMs);
	}

	return max(times);
}


export class BuildGraph {

	/**
	 * Static Pools is anything static for this Build Procedure,
	 * can be used as key to the tasks
	 */
	public readonly staticPools: StaticPoolMap = Object.create(null);
  public readonly tasks: Map<string, TaskNode> = new Map();

	public static fromJSON(objs: any): BuildGraph {
		if (!isObjectLike(objs)) {
			throw new Error(`ModuleGraph::fromJSON only received object, but got ${objs}`);
		}

    const result = new BuildGraph();

		if (!isObjectLike(objs['static'])) {
			throw new Error(`ModuleGraph::fromJSON objs.deps not found`);
		}

    Object.assign(result.staticPools, objs['static']);

    for (const key in objs.tasks) {
      const value = objs.tasks[key];
      result.tasks.set(key, value);
    }

    return result;
	}

	public constructor(
    public readonly deps: string[] = []
  ) {}

  /**
   * Track dependencies from an entry task,
   * telling yesbuild what tasks to rebuild.
   */
  public checkDependenciesUpdated(entry: string): string[] {
    const collector = new DependenciesCollector();
    const entryTask = this.tasks.get(entry);
    this.__collectTask(collector, entry, entryTask);
    this.__checkFilesDeps(collector);
    return this.__computeExecutionOrderOfTasks(
      collector.taskNamesToUpdate,
      collector.taskDeps
    );
  }

  /**
   * All the children tasks should run before the parents run.
   * Computes the right order.
   */
  private __computeExecutionOrderOfTasks(taskNames: Set<string>, taskDeps: Map<string, string[]>): string[] {
    const result: string[] = [];

    return result;
  }

  private __checkFilesDeps(collector: DependenciesCollector) {
    for (const [filename, taskNames] of collector.fileDeps) {
      this.__checkFileDeps(collector, filename, taskNames);
    }
  }

  private __checkFileDeps(collector: DependenciesCollector, filename: string, taskNames: string[]) {
    const outputs = this.__getAllOutputsOfTaskNames(taskNames);
    const latestTime = findLatestTimeOfOutput(outputs);
    const stat = fs.statSync(filename);
    const { mtimeMs } = stat;
    if (mtimeMs > latestTime) {  // updated found
      collector.addTaskNamesToUpdate(taskNames);
    }
  }

  private __getAllOutputsOfTaskNames(taskNames: string[]): string[] {
    const outputs: string[] = [];

    for (const taskName of taskNames) {
      const task = this.tasks.get(taskName);
      for (const output of task.outputs) {
        outputs.push(output);
      }
    }

    return outputs;
  }

  private __collectTask(collector: DependenciesCollector, taskName: string, task: TaskNode) {
    if (!task) {
      throw new Error(`Can not find task ${taskName}`);
    }
    for (const depLiteral of task.deps) {
      if (this.__tryCollectFileDep(collector, taskName, depLiteral)) {
        continue;
      } else if (this.__tryCollectTaskDep(collector, taskName, depLiteral)) {
        continue;
      } else {
        throw new Error(`Depencency ${depLiteral} is not supported`);
      }
    }
  }

  private __tryCollectFileDep(collector: DependenciesCollector, taskName: string, depLiteral: string): boolean {
    const testResult = testFileDep(depLiteral);
    if (isString(testResult)) {
      collector.pushFileDepForTask(taskName, testResult);
      return true;
    }
    return false;
  }

  /**
   * Is a task depends on another task,
   * we need the analysis the dependencis of that tasks too.
   */
  private __tryCollectTaskDep(collector: DependenciesCollector, taskName: string, depLiteral: string): boolean {
    const testResult = testTaskDep(depLiteral);
    if (isString(testResult)) {
      if (!collector.isTaskCollected) {
        collector.pushTaskDepForTask(taskName, testResult);
        const task = this.tasks.get(testResult);
        this.__collectTask(collector, taskName, task);
      }
      return true;
    }
    return false;
  }

  public async dumpToYml(path: string): Promise<any> {
		const objs: any = Object.create(null);
    objs['version'] = YML_VERSION;
    this.dumpStaticPools(objs);
    this.dumpTasks(objs);
    objs['deps'] = this.deps;

		const result = yaml.dump(objs);

    await fs.promises.writeFile(path, result);
  }

  private dumpTasks(objs: any) {
    const tasks: any = Object.create(null);

    for (const [key, value] of this.tasks) {
      tasks[key] = value;
    }

    objs["tasks"] = tasks;
  }

  private dumpStaticPools(objs: any) {
    objs['static'] = this.staticPools;
  }

}
