import Koa from 'koa';
import { serveStatic } from './middlewares';
import { ServerContext } from './context';
import { grey } from 'chalk';

export interface InternalServerOptions {
  host: string,
  port: number,
  mapProducts: string[],
}

export interface YesContext extends Koa.DefaultContext {
  serverContext: ServerContext;
}

export type KoaContext = Koa.ParameterizedContext<Koa.DefaultState, YesContext>;

export function startServer(staticDir: string, options: InternalServerOptions) {
  const serverContext = new ServerContext(options.mapProducts);
  const app = new Koa<Koa.DefaultState, YesContext>();
  app.use((ctx, next) => {
    ctx.serverContext = serverContext;
    return next();
  });
  app.use(serveStatic(staticDir));
  const { host, port } = options;
  console.log(`Listening on ${grey('http://' + host + ':' + port)}`)
  app.listen(port);
}
