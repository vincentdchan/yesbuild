import {
  ActionExecutor,
  EsbuildBundleExecutor,
  BuildOptions,
  ParallelExecutor,
  CopyExecutor,
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

export function useParallel(tasks: string[]): ActionExecutor {
  return new ParallelExecutor(tasks);
}

export function useCopy(files: string | string[], dest: string, options?: { relative?: string }): ActionExecutor {
  return new CopyExecutor({ src: files, dest, options });
}

export function useTask(taskName: string): ActionExecutor {
  return new AnotherTask(taskName);
}

export function useDevServer(options: DevServerOptions = {}): ActionExecutor {
  return new DevServer(options);
}

export { BuildOptions, DevServerOptions }
