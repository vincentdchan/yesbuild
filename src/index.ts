import cac from 'cac';
import { config, ConfigOptions } from './configProject';
import { build, BuildOptions } from './build';
import registry, { TaskCallback } from './registry';

const cli = cac();

cli
  .command('config <entry>', 'Config a dir from entry to build')
  .option('-o, --outdir <outdir>', 'Output dir')
  .option('--platform <platform>', 'Platform to bundle: browser|node|neutral', {
    default: 'browser'
  })
  .action((entry, options) => {
    const configOptions: ConfigOptions = {
      entry,
      platform: options.platform,
      buildDir: options.outdir,
    };

    config(configOptions).catch(err => {
      console.error(err);
      process.exit(1);
    });
  })

cli
  .command('build <builddir>', 'Build files in building dir')
  .option('-t, --task <task>', 'The name of the task to run, use \'*\' to run all', {
    default: 'default',
  })
  .action((builddir, options) => {
    const buildOptions: BuildOptions = {
      buildDir: builddir,
      task: options.task,
    };
    build(buildOptions).catch(err => {
      console.error(err);
      process.exit(1);
    });
  })

cli.help();

const result = cli.parse();

if (result.args.length === 0) {
  cli.outputHelp();
}

export * from './hooks';
export {
  ActionExecutor,
  ActionExecutorConstructor,
  registerAction,
  getAction,
} from './actions';
export { TaskCallback, ConfigOptions };
export default registry;
