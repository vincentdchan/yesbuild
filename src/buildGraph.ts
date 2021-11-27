import { isObjectLike, isUndefined, isString, max } from 'lodash-es';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { red } from 'chalk';
import { testFileDep, testTaskDep, Dependencies } from './dependency';
import logger from './logger';

const YML_VERSION = '1.0';

export interface ActionStore {
  name: string,
  params?: any;
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
  deps?: Dependencies;
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
      this.fileDeps.set(content, sources);
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

  public readonly tasks: Map<string, TaskNode> = new Map();

	public static fromJSON(objs: any): BuildGraph {
		if (!isObjectLike(objs)) {
			throw new Error(`ModuleGraph::fromJSON only received object, but got ${objs}`);
		}

    const result = new BuildGraph(objs.deps);

    for (const key in objs.tasks) {
      const value = objs.tasks[key];
      result.tasks.set(key, value);
    }

    return result;
	}

	public constructor(
    public readonly deps: string[] = []
  ) {}

  public needsReconfig(ymlPath: string): boolean {
    const stat = fs.statSync(ymlPath);
    const { mtimeMs } = stat;
    return this.__checkDepsForRoot(mtimeMs);
  }

  private __checkDepsForRoot(mtimeMs: number): boolean {
    const files: string [] = [];
    for (const depLiteral of this.deps) {
      let testResult = testFileDep(depLiteral);
      if (!isString(testResult)) {
        throw new Error(`Only file:// dependency is supported for yml, but ${depLiteral} got`);
      }
      files.push(testResult);
    }

    const latestTime = findLatestTimeOfOutput(files);
    return latestTime > mtimeMs;
  }

  /**
   * Track dependencies from an entry task,
   * telling yesbuild what tasks to rebuild.
   */
  public checkDependenciesUpdated(entry: string, forceUpdate: boolean = false): string[] {
    const collector = new DependenciesCollector();
    if (entry === '*') {
      const taskNames = [...this.tasks.keys()];
      collector.addTaskNamesToUpdate(taskNames);
    } else {
      const entryTask = this.tasks.get(entry);
      this.__collectTask(collector, entry, entryTask);
      if (forceUpdate) {
        this.__addAllSubTasks(collector, entry);
      } else {
        this.__checkFilesDeps(collector);
      }
    }
    return this.__computeExecutionOrderOfTasks(
      collector.taskNamesToUpdate,
      collector.taskDeps
    );
  }

  private __addAllSubTasks(collector: DependenciesCollector, entry: string) {
    const visitedNodes = new Set<string>();

    const names: string[] = [];
    function visitNode(name: string) {
      if (visitedNodes.has(name)) {
        return;
      }
      visitedNodes.add(name);
      names.push(name);

      const children = collector.taskDeps.get(name);
      if (!children) {
        return;
      }

      for (const child of children) {
        visitNode(child);
      }
    }

    visitNode(entry);
    collector.addTaskNamesToUpdate(names);
  }

  /**
   * All the children tasks should run before the parents run.
   * Computes the right order.
   * 
   * Find the free nodes first, free nodes representes the task that depends nothing.
   */
  private __computeExecutionOrderOfTasks(taskNames: Set<string>, taskDeps: Map<string, string[]>): string[] {
    const result: string[] = [];
    const visitedNodes: Set<string> = new Set();

    let iteratesNode: string[] = [];
    for (const taskName of taskNames) {
      const deps = taskDeps.get(taskName);
      // free nodes
      if (!deps || deps.length === 0) {
        result.push(taskName);
        visitedNodes.add(taskName);
      } else {
        iteratesNode.push(taskName);
      }
    }

    function isAllDepsSatisfied(deps: string[]) {
      for (const dep of deps) {
        if (!visitedNodes.has(dep)) {
          return false;
        }
      }

      return true;
    }

    // graph reduction
    while (iteratesNode.length > 0) {
      const nextIteratesNode: string[] = [];

      for (const taskName of iteratesNode) {
        const deps = taskDeps.get(taskName);
        if (isAllDepsSatisfied(deps)) {
          result.push(taskName);
          visitedNodes.add(taskName);
        } else {
          nextIteratesNode.push(taskName);
        }
      }

      iteratesNode = nextIteratesNode;
    }

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
      if (isUndefined(task.outputs)) {
        continue;
      }
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
    if (isUndefined(task.deps)) {
      return;
    }
    if (isString(task.deps)) {
      if (task.deps === '*') {
        collector.addTaskNamesToUpdate([taskName]);
      } else {
        logger.error(`${red('Error')}: Unreconiged deps: ${task.deps}, ignored.`);
      }
      return;
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
      if (!collector.isTaskCollected(testResult)) {
        collector.pushTaskDepForTask(taskName, testResult);
        const task = this.tasks.get(testResult);
        this.__collectTask(collector, testResult, task);
      }
      return true;
    }
    return false;
  }

  public async dumpToYml(path: string): Promise<any> {
		const objs: any = Object.create(null);
    objs['version'] = YML_VERSION;
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

}
