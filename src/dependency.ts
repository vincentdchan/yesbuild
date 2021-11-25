import { BuildGraph, TaskNode } from './buildGraph';
import { ActionExecutor } from './actions';

const FILE_PREFIX = 'file://';

export function makeFileDep(path: string) {
  return FILE_PREFIX + path;
}

export function testFileDep(literal: string): string | null {
  if (!literal.startsWith(FILE_PREFIX)) {
    return null;
  }
  return literal.slice(FILE_PREFIX.length);
}

export function makeStaticDep(name: string) {
  return 'static://' + name;
}

export class DependencyBuilder {

  /**
   * use Set<> to avoid duplicate deps
   */
  private __deps: Set<string> = new Set();
  public readonly actions: ActionExecutor[] = [];

  public constructor(
    public readonly graph: BuildGraph,
    public readonly buildDir: string,
    private taskNode: TaskNode,
  ) {

  }

  public addStaticPoolDep(name: string) {
    this.addDep(makeStaticDep(name));
  }

  public addAction(action: ActionExecutor) {
    this.actions.push(action);
  }

  private addDep(literal: string) {
    this.__deps.add(literal);
  }

  public finalize() {
    for (const dep of this.__deps) {
      this.taskNode.deps.push(dep);
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
