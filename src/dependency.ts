import { isUndefined, isArray } from 'lodash-es';
import { BuildGraph, TaskNode } from './buildGraph';
import { ActionExecutor } from './actions';

const FILE_PREFIX = 'file://';

export type Dependencies = string[] | '*' | undefined;

export function makeFileDep(path: string) {
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

  /**
   * use Set<> to avoid duplicate deps
   */
  private __deps: Dependencies = undefined;
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

  public finalize() {
    if (isArray(this.__deps)) {
      this.taskNode.deps = this.__deps.sort();
    } else {
      this.taskNode.deps = this.__deps;
    }
  }

}

let depBuilder: DependencyBuilder;

export function newDependencyBuilder(graph: BuildGraph, buildDir: string, taskNode: TaskNode): DependencyBuilder {
  depBuilder = new DependencyBuilder(graph, buildDir, taskNode);
  return depBuilder;
}

export function getDependencyBuilder(): DependencyBuilder {
  return depBuilder;
}
