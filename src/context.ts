import { BuildGraph, TaskNode } from './buildGraph';
import { isArray } from 'lodash-es';
import { DependencyBuilder, Dependencies } from './dependency';
import { OutputBuilder } from './output';
import logger from './logger';

export class YesbuildContext {

  public readonly depsBuilder: DependencyBuilder = new DependencyBuilder();
  public readonly outputsBuilder: OutputBuilder = new OutputBuilder();

  public constructor(
    public readonly graph: BuildGraph,
    public readonly taskDir: string,
    private taskNode: TaskNode
  ) { }

  public addDeps(deps: Dependencies) {
    if (deps === '*') {
      this.depsBuilder.addDep(deps);
    } else if (isArray(deps)) {
      for (const d of deps) {
        this.depsBuilder.addDep(d);
      }
    }
  }

  public finalize() {
    logger.plusTaskCounter();
    this.taskNode.deps = this.depsBuilder.finalize();
    this.taskNode.outputs = this.outputsBuilder.finalize().map(o => o.file);
  }

}

let yesbuildContext: YesbuildContext;

export function newYesbuildContext(graph: BuildGraph, taskDir: string, taskNode: TaskNode): YesbuildContext {
  yesbuildContext = new YesbuildContext(graph, taskDir, taskNode);
  return yesbuildContext;
}

export function useYesbuildContext(): YesbuildContext {
  return yesbuildContext;
}
