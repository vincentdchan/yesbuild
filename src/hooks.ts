import {
  ActionExecutor,
  EsbuildBundleExecutor,
  BuildOptions,
  TypeScriptExecutor,
  ParallelExecutor,
  TypeScriptBuildOptions,
  CopyFromExecutor,
  AnotherTask,
  DevServerOptions,
  DevServer,
} from './actions';
import { runningTaskRunner } from './buildScript';

export function useTaskDir(): string {
  return runningTaskRunner.taskDir;
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

export function useCopyFrom(files: string | string[]): ActionExecutor {
  return new CopyFromExecutor(files);
}

export function useTask(taskName: string): ActionExecutor {
  return new AnotherTask(taskName);
}

export function useDevServer(options: DevServerOptions = {}): ActionExecutor {
  return new DevServer(options);
}

export { BuildOptions, DevServerOptions }
