import * as fs from 'fs';
import { isUndefined, isArray } from 'lodash-es';
import { ActionExecutor, mount, ExecutionContext } from './common';
import { Stage } from '../flags';
import { ActionResult } from '../registry';
import { startServer, InternalServerOptions, ProductsMapping } from '../server';
import logger from '../logger';

interface DevServerProps {
  host?: string,
  port?: number,
  productsMapping?: ProductsMapping,
  mapTasks: string[],
}

export class DevServer extends ActionExecutor<DevServerProps> {

  public static actionName: string = 'internal:devServer';

  public constructor(props: DevServerProps) {
    super(props);
  }

	public execute(ctx: ExecutionContext) {
    const { taskDir, buildDir } = ctx;
    ctx.depsBuilder.addDep('*');
    if (ctx.stage === Stage.Configure) {
      fs.mkdirSync(taskDir, { recursive: true });
      return;
    }

    // start server when everything is done
    logger.registerExitCallback((exitCode: number) => {
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
      const { host, port, mapTasks } = this.props;
      const options: InternalServerOptions = {
        host: host || '127.0.0.1',
        port: port || 3000,
        mapTasks,
        buildDir,
      };
      startServer(taskDir, options);
    })
  }

}

mount(DevServer);

export interface DevServerExportProps {
  host?: string,
  port?: number,
  mapTasks?: ActionResult[],
}

export function useDevServer(props: DevServerExportProps = {}): DevServer {
  let mapping: ProductsMapping | undefined = undefined;
  const { port, host } = props;

  const mapTasks = [];

  if (isArray(props.mapTasks)) {
    for (const task of props.mapTasks) {
      if (isUndefined(task.taskName)) {
        continue;
      }
      mapTasks.push(task.taskName);
    }
  }

  const internalProps: DevServerProps = {
    port, host,
    productsMapping: mapping,
    mapTasks,
  }
  return new DevServer(internalProps);
}
