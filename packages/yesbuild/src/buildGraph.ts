import { isObjectLike, isUndefined, isString, isArray, maxBy } from 'lodash-es';
import * as path from 'path';
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
  products: string[];
  deps?: Dependencies;
}

export function makeTaskNode(): TaskNode {
  return {
    actions: [],
    products: Object.create(null),
    deps: undefined,
  };
}

function makeTaskYmlFilename(buildDir: string, taskName: string): string {
  return path.join(buildDir, `yesbuild.${taskName}.yml`);
}

function makeMetaYmlFilename(buildDir): string {
  return path.join(buildDir, 'yesbuild.yml');
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

  public constructor() { }

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

function findLatestTimeOfOutput(outputs: string[]): [string, number] | '*' | undefined {
  if (outputs.length === 0) {
    return undefined;
  }

  const times: [string, number][] = [];

  for (const output of outputs) {
    try {
      const stat = fs.statSync(output);
      const { mtimeMs } = stat;
      times.push([output, mtimeMs]);
    } catch (err) {
      return '*';
    }
  }

  return maxBy(times, ([, time]) => time);
}

// load task on demand
class TaskManager {

  private __tasks: Map<string, TaskNode> = new Map();
  protected __metaDeps: Dependencies;

  public constructor(protected buildDir: string, metaDeps: Dependencies = undefined) {
    this.__metaDeps = metaDeps;
  }

  private __loadPartialFromYml(path: string): TaskNode | undefined {
    const content = fs.readFileSync(path, 'utf-8');
    const objs: any = yaml.load(content);
    return this.__fromJSON(objs);
  }

  private __fromJSON(objs: any): TaskNode | undefined {
    if (!isObjectLike(objs)) {
      throw new Error(`ModuleGraph::__fromJSON only received object, but got ${objs}`);
    }

    if (isArray(objs['tasks'])) {
      for (const task of objs['tasks']) {
        if (isObjectLike(task)) {
          const { name, ...taskNode } = task;
          if (isString(name)) {
            this.insertTask(name, taskNode);
            return taskNode;
          }
        }
      }
    }

    return undefined;
  }

  public forceReloadTask(taskName: string) {
    const path = makeTaskYmlFilename(this.buildDir, taskName);
    const taskNode = this.__loadPartialFromYml(path);
    this.__tasks.set(taskName, taskNode);
  }

  public loadTask(taskName: string): TaskNode {
    let taskNode = this.__tasks.get(taskName);
    if (!taskNode) {
      const path = makeTaskYmlFilename(this.buildDir, taskName);
      taskNode = this.__loadPartialFromYml(path);
      this.__tasks.set(taskName, taskNode);
    }
    return taskNode;
  }

  public insertTask(taskName: string, taskNode: TaskNode) {
    this.__tasks.set(taskName, taskNode);
  }

  public getOrNewTaskNode(taskName: string): TaskNode {
    let taskNode = this.__tasks.get(taskName);
    if (!taskNode) {
      taskNode = makeTaskNode();
      this.__tasks.set(taskName, taskNode);
    }

    return taskNode;
  }

  protected getAllTasknames(): string[] {
    return [...this.__tasks.keys()];
  }

  protected __loadMeta(buildDir: string) {
    const filename = makeMetaYmlFilename(buildDir);
    const content = fs.readFileSync(filename, 'utf8');
    const objs: any = yaml.load(content);
    this.__metaDeps = objs.deps;
  }

  public async dumpFiles(ignoreMeta?: boolean): Promise<any> {
    if (!ignoreMeta) {
      await this.__dumpMetaFiles();
    }

    const promises: Promise<any>[] = [];
    for (const [taskName, task] of this.__tasks) {
      promises.push(this.__dumpFile(taskName, task));
    }

    await Promise.all(promises);

    for (const [taskName, ] of this.__tasks) {
      const ymlPath = makeTaskYmlFilename(this.buildDir, taskName);
      logger.addUpdatedYml(ymlPath);
    }
  }

  private __dumpFile(taskName: string, taskNode: TaskNode): Promise<any> {
    const path = makeTaskYmlFilename(this.buildDir, taskName);
    const objs: any = Object.create(null);
    objs['version'] = YML_VERSION;

    const tasks = {
      name: taskName,
      ...taskNode,
    }

    objs['tasks'] = [tasks];

    const result = yaml.dump(objs);

    return fs.promises.writeFile(path, result);
  }

  private __dumpMetaFiles(): Promise<any> {
    const filename = makeMetaYmlFilename(this.buildDir);
    const objs: any = Object.create(null);
    objs['version'] = YML_VERSION;
    objs['deps'] = this.__metaDeps;
    const result = yaml.dump(objs);

    return fs.promises.writeFile(filename, result);
  }

}

/**
 * Centrail data to store Graph
 */
export class BuildGraph extends TaskManager {

  public constructor(buildDir: string, metaDeps: Dependencies = undefined) {
    super(buildDir, metaDeps);
  }

  /**
   * Check if the dependencies of `yesbuild.yml` changed,
   * if changed, return the filename.
   */
  public needsReconfig(): string| '*' | undefined {
    this.__loadMeta(this.buildDir);
    const ymlPath = makeMetaYmlFilename(this.buildDir);
    const stat = fs.statSync(ymlPath);
    const { mtimeMs } = stat;
    return this.__checkDepsForRoot(mtimeMs);
  }

  private __checkDepsForRoot(mtimeMs: number): string | '*' | undefined {
    if (!isArray(this.__metaDeps)) {
      return undefined;
    }
    const files: string[] = [];
    for (const depLiteral of this.__metaDeps) {
      let testResult = testFileDep(depLiteral);
      if (!isString(testResult)) {
        throw new Error(`Only file:// dependency is supported for yesbuild.yml, but ${depLiteral} got`);
      }
      files.push(testResult);
    }

    const findResult = findLatestTimeOfOutput(files);

    if (isUndefined(findResult)) {
      return undefined;
    }

    if (findResult === '*') {
      return '*'
    }

    const [filename, latestTime] = findResult;
    if (latestTime > mtimeMs) {
      return filename;
    }
    return undefined;
  }

  /**
   * Track dependencies from an entry task,
   * telling yesbuild what tasks to rebuild.
   */
  public checkDependenciesUpdated(entry: string, forceUpdate: boolean = false): string[] {
    const collector = new DependenciesCollector();
    if (entry === '*') {
      const taskNames = this.getAllTasknames();
      collector.addTaskNamesToUpdate(taskNames);
    } else {
      const entryTask = this.loadTask(entry);
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

  public collectAllFilesDeps(entry: string): string[] {
    const collector = new DependenciesCollector();
    const entryTask = this.loadTask(entry);
    this.__collectTask(collector, entry, entryTask);
    return [...collector.fileDeps.keys()];
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
   * Computes the correct order.
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

    let lastIterLen = iteratesNode.length;
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

      if (nextIteratesNode.length === lastIterLen) {
        throw new Error(`Dead loop detection for tasks: ${iteratesNode.join(', ')}`);
      }
      lastIterLen = nextIteratesNode.length;
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
    const findResult = findLatestTimeOfOutput(outputs);
    if (isUndefined(findResult)) {
      return;
    }
    if (findResult === '*') {
      collector.addTaskNamesToUpdate(taskNames);
      return;
    }
    const [, latestTime] = findResult;
    let changed: boolean = false;
    try {
      const stat = fs.statSync(filename);
      const { mtimeMs } = stat;
      if (mtimeMs > latestTime) {  // updated found
        changed = true;
      }
    } catch (err) {  // stat failed, so files maybe deleted, rebuild it
      changed = true;
    }

    if (changed) {
      collector.addTaskNamesToUpdate(taskNames);
    }
  }

  private __getAllOutputsOfTaskNames(taskNames: string[]): string[] {
    const outputs: string[] = [];

    for (const taskName of taskNames) {
      const task = this.loadTask(taskName);
      if (isUndefined(task.products)) {
        continue;
      }
      for (const output of task.products) {
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
        const task = this.loadTask(testResult);
        this.__collectTask(collector, testResult, task);
      }
      return true;
    }
    return false;
  }

}
