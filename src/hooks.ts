import { getDependencyBuilder } from './dependency';
import { join } from 'path';
import { EsbuildBundleExecutor } from './actions';

export function useStatic<T = any>(name: string, defaultValue?: T): T {
  const builder = getDependencyBuilder();
  builder.addStaticPoolDep(name);
  const { graph } = builder;
  return graph.staticPools[name] || defaultValue;
}

export function useBuildDir(): string {
  const builder = getDependencyBuilder();
  return builder.buildDir;
}

export function useServeDir(): string {
  const buildDir = useBuildDir();
  return join(buildDir, 'files');
}

export interface YesBuildOptions {
  entry: string;
}

export function useBuild(options: YesBuildOptions): void {
  const builder = getDependencyBuilder();
  const { entry } = options;
  const actionExecutor = new EsbuildBundleExecutor({
    entry,
  });

  builder.addAction(actionExecutor);
}
