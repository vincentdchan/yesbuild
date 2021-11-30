import cac from 'cac';
import configure, { ConfigOptions } from './configure';
import { build, BuildOptions } from './build';
import { watch } from './watch';
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
        logger.printAndExit({ ignoreYmlFiles: true });
      })
      .catch(err => {
        logger.panic(err.toString())
      });
  })

cli
  .command('build', 'Build files in building dir')
  .option('-d, --dir <builddir>', 'Build direcotry', {
    default: 'build',
  })
  .option('-t, --task <task>', 'The name of the task to run, use \'*\' to run all', {
    default: 'default',
  })
  .option('-f, --force', 'Force rebuild')
  .option('--log <log>', 'Log type')
  .option('--ignore-meta', 'Do NOT check the original config file')
  .action((options) => {
    let flags = 0;
    flags |= options.force ? FLAGS_FORCE_UPDATE : 0;
    flags |= options.ignoreMeta ? FLAGS_IGNORE_META : 0;
    const buildOptions: BuildOptions = {
      buildDir: options.dir,
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

cli
  .command('watch [...tasks]', 'Watch files to build automatically')
  .option('-d, --dir <builddir>', 'Build direcotry', {
    default: 'build',
  })
  .action((tasks, options) => {
    if (tasks.length === 0) {
      tasks = ['default'];
    }
    watch({
      buildDir: options.dir,
      taskNames: tasks,
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
  ExecutionContext,
  registerAction,
  getAction,
} from './actions';
export { TaskCallback, ConfigOptions, ActionResult, ActionExecutorGenerator };
export default registry;
