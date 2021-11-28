import { BuildGraph, TaskNode } from './buildGraph';
import { ActionExecutor } from './actions';
import { DependencyBuilder } from './dependency';

export class YesbuildContext {

  private __depsBuilder: DependencyBuilder = new DependencyBuilder();
  public readonly actions: ActionExecutor[] = [];

  public constructor(
    public readonly graph: BuildGraph,
    public readonly buildDir: string,
    private taskNode: TaskNode
  ) { }

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
