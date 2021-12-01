import Koa from 'koa';
import { grey } from 'chalk';
import { isArray } from 'lodash-es';
import { serveStatic } from './middlewares';
import { ServerContext } from './context';
import { watch } from '../watch';

export interface ProductsMapping {
  [key: string]: string,
}

export interface InternalServerOptions {
  host: string,
  port: number,
  buildDir: string,
  productsMapping?: ProductsMapping,
  watchTasks?: string[],
}

export interface YesContext extends Koa.DefaultContext {
  serverContext: ServerContext;
}

export type KoaContext = Koa.ParameterizedContext<Koa.DefaultState, YesContext>;

export function startServer(staticDir: string, options: InternalServerOptions) {
  const serverContext = new ServerContext(options.productsMapping || Object.create(null));
  const app = new Koa<Koa.DefaultState, YesContext>();
  app.use((ctx, next) => {
    ctx.serverContext = serverContext;
    return next();
  });
  app.use(serveStatic(staticDir));

  if (isArray(options.watchTasks)) {
    watch({
      buildDir: options.buildDir,
      taskNames: options.watchTasks,
    })
  }

  const { host, port } = options;
  console.log(`Listening on ${grey('http://' + host + ':' + port)}`)
  app.listen(port);
}
