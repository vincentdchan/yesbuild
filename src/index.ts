import cac from 'cac';
import configure, { ConfigOptions } from './configure';
import { build, BuildOptions } from './build';
import registry, { TaskCallback, ActionResult, ActionExecutorGenerator } from './registry';
import logger, { LogMode } from './logger';
import { FLAGS_FORCE_UPDATE, FLAGS_IGNORE_META } from './flags';

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

    configure(configOptions)
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
    let flags = 0;
    flags |= options.force ? FLAGS_FORCE_UPDATE : 0;
    flags |= options.ignoreMeta ? FLAGS_IGNORE_META : 0;
    const buildOptions: BuildOptions = {
      buildDir: builddir,
      task: options.task,
      flags,
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
export { TaskCallback, ConfigOptions, ActionResult, ActionExecutorGenerator };
export default registry;
