import Koa from 'koa';
import { grey } from 'chalk';
import { isArray } from 'lodash-es';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
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
  mapTasks: string[],
}

export interface YesContext extends Koa.DefaultContext {
  serverContext: ServerContext;
}

export type KoaContext = Koa.ParameterizedContext<Koa.DefaultState, YesContext>;

export function startServer(staticDir: string, options: InternalServerOptions) {
  const serverContext = new ServerContext(options.buildDir, options.mapTasks);
  const app = new Koa<Koa.DefaultState, YesContext>();
  app.use((ctx, next) => {
    ctx.serverContext = serverContext;
    return next();
  });
  app.use(serveStatic(staticDir));

  function handleBuildFinished() {
    serverContext.notifyAllClientsToUpdate();
  }

  if (options.mapTasks.length > 0) {
    watch({
      buildDir: options.buildDir,
      taskNames: options.mapTasks,
      finished: [handleBuildFinished],
    });
  }

  const httpServer = createServer(app.callback());

  const { host, port } = options;
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/__yesbuild_ws',
  });

  wss.on('connection', function(ws) {
    serverContext.addClient(ws);
  });

  console.log(`Listening on ${grey('http://' + host + ':' + port)}`)

  httpServer.listen(port);
}
