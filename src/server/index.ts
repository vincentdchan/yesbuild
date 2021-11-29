import Koa from 'koa';

export interface ServerOptions {
  buildDir?: string;
  port: number;
}

export function startServer(options: ServerOptions) {
  const app = new Koa();
  const { port } = options;
  app.listen(port);
}
