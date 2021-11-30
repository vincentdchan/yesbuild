import {
  ActionExecutor,
  EsbuildBundleExecutor,
  EsBuildProps,
  ParallelExecutor,
  CopyExecutor,
  AnotherTask,
  DevServerProps,
  DevServer,
} from './actions';
import { runningTaskRunner } from './buildScript';

export function useTaskDir(): string {
  return runningTaskRunner.taskDir;
}

export function uesEsBuild(options: EsBuildProps): EsbuildBundleExecutor {
  return new EsbuildBundleExecutor(options);
}

export function useParallel(tasks: string[]): ParallelExecutor {
  return new ParallelExecutor(tasks);
}

export function useCopy(files: string | string[], dest: string, options?: { relative?: string }): CopyExecutor {
  return new CopyExecutor({ src: files, dest, options });
}

export function useTask(taskName: string): AnotherTask {
  return new AnotherTask(taskName);
}

export function useDevServer(options: DevServerProps = {}): DevServer {
  return new DevServer(options);
}

export { EsBuildProps as BuildOptions, DevServerProps as DevServerOptions }
