import { isUndefined, isArray } from 'lodash-es';
import { BuildGraph, TaskNode } from './buildGraph';
import { ActionExecutor } from './actions';

const FILE_PREFIX = 'file://';

export type Dependencies = string[] | '*' | undefined;

function makeFileDep(path: string) {
  return FILE_PREFIX + path;
}

function makeTestDep(prefix: string): (literal: string) => string | null {
  return (literal: string) => {
    if (!literal.startsWith(prefix)) {
      return null;
    }
    return literal.slice(prefix.length);
  }
}

export function makeStaticDep(name: string) {
  return 'static://' + name;
}

const TASK_PREFIX = 'task://';

export function makeTaskDep(path: string) {
  return TASK_PREFIX + path;
}

export const testFileDep = makeTestDep(FILE_PREFIX);
export const testTaskDep = makeTestDep(TASK_PREFIX);

export class DependencyBuilder {

  private __deps: Dependencies = undefined;

  public constructor() {}

  public addDep(literal: string) {
    if (this.__deps === '*') {
      return;
    }
    if (literal === '*') {
      this.__deps = '*';
      return;
    }
    if (isUndefined(this.__deps)) {
      this.__deps = [];
    }
    this.__deps.push(literal);
  }

  public dependFile(path: string) {
    this.addDep(makeFileDep(path));
  }

  public finalize(): Dependencies {
    if (isArray(this.__deps)) {
      return this.__deps.sort();
    } else {
      return this.__deps;
    }
  }

}

export class YesbuildContext {

  /**
   * use Set<> to avoid duplicate deps
   */
  private __depsBuilder: DependencyBuilder = new DependencyBuilder();
  public readonly actions: ActionExecutor[] = [];

  public constructor(
    public readonly graph: BuildGraph,
    public readonly buildDir: string,
    private taskNode: TaskNode,
  ) {}

  public addStaticPoolDep(name: string) {
    this.addDep(makeStaticDep(name));
  }

  public addAction(action: ActionExecutor) {
    this.actions.push(action);
  }

  private addDep(literal: string) {
    this.__depsBuilder.addDep(literal);
  }

  public finalize() {
    this.taskNode.deps = this.__depsBuilder.finalize();
  }

}

let yesbuildContext: YesbuildContext;

export function newYesbuildContext(graph: BuildGraph, buildDir: string, taskNode: TaskNode): YesbuildContext {
  yesbuildContext = new YesbuildContext(graph, buildDir, taskNode);
  return yesbuildContext;
}

export function useYesbuildContext(): YesbuildContext {
  return yesbuildContext;
}
