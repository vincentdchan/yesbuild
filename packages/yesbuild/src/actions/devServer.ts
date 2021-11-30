import { ActionExecutor, registerAction, ExecutionContext } from './common';
import { isString, isUndefined } from 'lodash-es';
import { Stage } from '../flags';
import { ProductsWithSize } from '../product';
import * as fs from 'fs';
import logger from '../logger';
import { startServer, InternalServerOptions } from '../server';

export interface DevServerOptions {
  host?: string,
  port?: number,
  products?: ProductsWithSize | string[],
  mapProducts?: string[],
}

export class DevServer extends ActionExecutor {

  public static actionName: string = 'internal:devServer';
  private __options: InternalServerOptions;

  public constructor(options: DevServerOptions) {
    super();
    let { host, port, products, mapProducts } = options;
    host = host || '127.0.0.1';
    port = port || 3000;

    if (isUndefined(mapProducts)) {
      mapProducts = [];
    }

    if (!isUndefined(products)) {
      mapProducts.length = products.length;
      for (let i = 0; i < products.length; i++) {
        const item = products[i];
        if (isString(item)) {
          mapProducts[i] = item;
        } else {
          mapProducts[i] = item.file;
        }
      }
    }
    this.__options = {
      host,
      port,
      mapProducts,
    }
  }

	public execute(ctx: ExecutionContext) {
    const { taskDir } = ctx;
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
      startServer(taskDir, this.__options);
    })
  }

  public getParams() {
    return this.__options;
  }

}

registerAction(DevServer);
