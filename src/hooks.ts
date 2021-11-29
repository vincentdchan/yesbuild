import { useYesbuildContext } from "./context";
import { join } from 'path';
import {
  ActionExecutor,
  EsbuildBundleExecutor,
  BuildOptions,
  TypeScriptExecutor,
  ParallelExecutor,
  TypeScriptBuildOptions,
} from './actions';

export function useBuildDir(): string {
  const builder = useYesbuildContext();
  return builder.buildDir;
}

export function useServeDir(): string {
  const buildDir = useBuildDir();
  return join(buildDir, 'files');
}

export function uesEsBuild(options: BuildOptions): ActionExecutor {
  return new EsbuildBundleExecutor(options);
}

export function useTypeScript(options: TypeScriptBuildOptions): ActionExecutor {
  return new TypeScriptExecutor(options);
}

export function useParallel(tasks: string[]): ActionExecutor {
  return new ParallelExecutor(tasks);
}

export { BuildOptions }
