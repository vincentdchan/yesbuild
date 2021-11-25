import { getDependencyBuilder } from './dependency';
import { join } from 'path';
import { EsbuildBundleExecutor, BuildOptions, TypeScriptExecutor } from './actions';
import type { BuildOptions as TsBuildOptions } from 'typescript';

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

export function useBuild(options: BuildOptions): void {
  const builder = getDependencyBuilder();
  const actionExecutor = new EsbuildBundleExecutor(options);

  builder.addAction(actionExecutor);
}

export function useTypeScript(options: TsBuildOptions): void {
  const builder = getDependencyBuilder();
  const executor = new TypeScriptExecutor(options);

  builder.addAction(executor);
}

export { BuildOptions }
