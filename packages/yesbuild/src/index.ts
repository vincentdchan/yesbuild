import cac from 'cac';
import * as fs from 'fs';
import configure, { ConfigOptions } from './configure';
import { build, BuildOptions } from './build';
import { watch } from './watch';
import registry, { TaskCallback, ActionResult, ActionExecutorGenerator } from './registry';
import { grey } from 'chalk';
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

async function friendlyBuild(buildDir: string, taskName: string, force: boolean, ignoreMeta: boolean, log?: string) {
  let flags = 0;
  flags |= force ? FLAGS_FORCE_UPDATE : 0;
  flags |= ignoreMeta ? FLAGS_IGNORE_META : 0;
  const buildOptions: BuildOptions = {
    buildDir,
    task: taskName,
    flags,
  };
  if (log === 'json') {
    logger.mode = LogMode.Data;
  }

  try {
    if (!fs.existsSync(buildDir)) {
      console.log(`Directory ${grey(buildDir)} not exist, begin to config...`);
      await configure({
        buildDir,
      });
      logger.printAndExit();
      return;
    }

    await build(buildOptions);
    logger.printAndExit();
  } catch (err) {
    logger.panic(err.toString());
  }
}

cli
  .command('', 'Build files in building dir')
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
    friendlyBuild(options.dir, options.task, options.force, options.ignoreMeta, options.log);
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
  mount,
  getAction,
} from './actions';
export { TaskCallback, ConfigOptions, ActionResult, ActionExecutorGenerator };
export default registry;
