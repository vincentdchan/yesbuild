import { ActionExecutor, registerAction, ExecutionContext } from './common';
import { isString, isUndefined } from 'lodash-es';
import { Stage } from '../flags';
import { Outputs } from '../output';

export interface DevServerOptions {
  host?: string,
  port?: number,
  outputs?: Outputs | string[],
  mapOutputs?: string[],
}

interface InternalOptions {
  host: string,
  port: number,
  mapOutputs: string[],
}

export class DevServer extends ActionExecutor {

  public static actionName: string = 'devServer';
  private __options: InternalOptions;

  public constructor(options: DevServerOptions) {
    super();
    let { host, port, outputs, mapOutputs } = options;
    host = host || '127.0.0.1';
    port = port || 3000;

    if (isUndefined(mapOutputs)) {
      mapOutputs = [];
    }

    if (!isUndefined(outputs)) {
      mapOutputs.length = outputs.length;
      for (let i = 0; i < outputs.length; i++) {
        const item = outputs[i];
        if (isString(item)) {
          mapOutputs[i] = item;
        } else {
          mapOutputs[i] = item.file;
        }
      }
    }
    this.__options = {
      host,
      port,
      mapOutputs,
    }
  }

	public execute(ctx: ExecutionContext) {
    if (ctx.stage === Stage.Configure) {
      ctx.depsBuilder.addDep('*');
    }
  }

  getParams() {
    return this.__options;
  }

}

registerAction(DevServer);
