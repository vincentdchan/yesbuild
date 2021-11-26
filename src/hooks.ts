import { getDependencyBuilder } from './dependency';
import { join } from 'path';
import {
  EsbuildBundleExecutor,
  BuildOptions,
  TypeScriptExecutor,
  ParallelExecutor,
  TypeScriptBuildOptions,
} from './actions';

export function useBuildDir(): string {
  const builder = getDependencyBuilder();
  return builder.buildDir;
}

export function useServeDir(): string {
  const buildDir = useBuildDir();
  return join(buildDir, 'files');
}

export function useBuild(options: BuildOptions): void {
  const builder = getDependencyBuilder();
  const actionExecutor = new EsbuildBundleExecutor(options);

  builder.addAction(actionExecutor);
}

export function useTypeScript(options: TypeScriptBuildOptions): void {
  const builder = getDependencyBuilder();
  const executor = new TypeScriptExecutor(options);

  builder.addAction(executor);
}

export function useParallel(tasks: string[]): void {
  const builder = getDependencyBuilder();
  const executor = new ParallelExecutor(tasks);

  builder.addAction(executor);
}

export { BuildOptions }
