import {
  EsbuildBundleExecutor,
  EsBuildProps,
  ParallelExecutor,
  CopyExecutor,
  AnotherTask,
  DevServerExportProps,
  useDevServer
} from './actions';

export function useEsBuild(options: EsBuildProps): EsbuildBundleExecutor {
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

export { useTaskDir, useBuildDir } from './buildScript';
export {
  EsBuildProps,
  DevServerExportProps,
  useDevServer,
}
