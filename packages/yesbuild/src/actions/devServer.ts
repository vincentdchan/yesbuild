import * as fs from 'fs';
import * as path from 'path';
import { isUndefined, isString } from 'lodash-es';
import { ActionExecutor, registerAction, ExecutionContext } from './common';
import { Stage } from '../flags';
import { ActionResult } from '../registry';
import { startServer, InternalServerOptions, ProductsMapping } from '../server';
import { useBuildDir } from '../buildScript';
import logger from '../logger';

interface DevServerProps {
  host?: string,
  port?: number,
  productsMapping?: ProductsMapping,
  watchTasks?: string[],
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
      const { host, port, productsMapping, watchTasks } = this.props;
      const options: InternalServerOptions = {
        host: host || '127.0.0.1',
        port: port || 3000,
        productsMapping,
        watchTasks,
        buildDir,
      };
      startServer(taskDir, options);
    })
  }

}

registerAction(DevServer);

export interface DevServerExportProps {
  host?: string,
  port?: number,
  mapResults?: ActionResult[],
}

// only run in the task runner, or it will crahsh
function createMappingByResult(results: ActionResult[]): ProductsMapping {
  const mapping = Object.create(null);

  for (const item of results) {
    const relativeDir = item.taskDir || useBuildDir();
    for (const product of item.products) {
      const filePath = product.file;
      let key = path.relative(relativeDir, filePath);
      key = '/' + key;
      mapping[key] = filePath;
    }
  }

  return mapping;
}

export function useDevServer(props: DevServerExportProps = {}): DevServer {
  let mapping: ProductsMapping | undefined = undefined;
  let watchTasks: string[] | undefined = undefined;

  if (!isUndefined(props.mapResults)) {
    mapping = createMappingByResult(props.mapResults);

    for (const item of props.mapResults) {
      const { taskName } = item;
      if (!isString(taskName)) {
        continue;
      }

      if (isUndefined(watchTasks)) {
        watchTasks = [];
      }

      watchTasks.push(taskName);
    }
  }

  const { port, host } = props;
  const internalProps: DevServerProps = {
    port, host,
    productsMapping: mapping,
    watchTasks,
  }
  return new DevServer(internalProps);
}
