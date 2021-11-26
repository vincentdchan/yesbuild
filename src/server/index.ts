import { createServer } from 'http';

export interface ServerOptions {
  buildDir?: string;
  port: number;
}

export function startServer(options: ServerOptions) {
  const server = createServer();
  const { port } = options;
  server.listen(port);
}
