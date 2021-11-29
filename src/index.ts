import cac from 'cac';
import { config, ConfigOptions } from './configProject';
import { build, BuildOptions } from './build';
import registry, { TaskCallback } from './registry';
import { startServer } from './server';
import logger, { LogMode } from './logger';

const cli = cac();

cli
  .command('config', 'Config a dir from entry to build')
  .option('-o, --outdir <outdir>', 'Output dir', {
    default: 'build',
  })
  .action((options) => {
    const configOptions: ConfigOptions = {
      buildDir: options.outdir,
    };

    config(configOptions)
      .then(() => {
        logger.printAndExit()
      })
      .catch(err => {
        logger.panic(err.toString())
      });
  })

cli
  .command('build <builddir>', 'Build files in building dir')
  .option('-t, --task <task>', 'The name of the task to run, use \'*\' to run all', {
    default: 'default',
  })
  .option('-f, --force', 'Force rebuild')
  .option('--log <log>', 'Log type')
  .option('--ignore-meta', 'Do NOT check the original config file')
  .action((builddir, options) => {
    const buildOptions: BuildOptions = {
      buildDir: builddir,
      task: options.task,
      forceUpdate: options.force,
      ignoreMeta: options.ignoreMeta,
    };
    if (options.log === 'json') {
      logger.mode = LogMode.Data;
    }
    build(buildOptions)
      .then(() => {
        logger.printAndExit()
      })
      .catch(err => {
        logger.panic(err.toString())
      });
  })

cli
  .command('serve <builddir>', 'Serve files in building dir')
  .option('-p, --port <port>', 'The port of the server', {
    default: 3000,
  })
  .action((builddir, options) => {
    startServer({
      buildDir: builddir,
      port: options.port,
    });
  })

cli.help();

try {
  cli.parse();
} catch (err) {
  logger.panic(err.toString());
}

export * from './hooks';
export {
  ActionExecutor,
  ActionExecutorConstructor,
  ExecutionContext as ExecuteContext,
  registerAction,
  getAction,
} from './actions';
export { useYesbuildContext } from './context';
export { TaskCallback, ConfigOptions };
export default registry;
