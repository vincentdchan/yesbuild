import cac from 'cac';
import { config, ConfigOptions } from './configProject';

const cli = cac();

cli
  .command('config <entry>', 'Config a dir from entry to build')
  .option('-o, --outdir <outdir>', 'Output dir')
  .option('--platform <platform>', 'Platform to bundle: browser|node|neutral', {
    default: 'browser'
  })
  .action((entry, options) => {
    const buildOptions: ConfigOptions = {
      entry,
      platform: options.platform,
      buildDir: options.outdir,
    };

    config(buildOptions);
  })

cli.help();

const result = cli.parse();

if (result.args.length === 0) {
  cli.outputHelp();
}
