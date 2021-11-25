import * as fs from 'fs';
import { join } from 'path';
import { RegistryContext }  from './registry';
import { BuildGraph } from './buildGraph';
import { runAllTasks, RunTaskOptions } from './build';
import type { ConfigOptions } from './configProject';

/**
 * A profile is like a set of configurations
 * to help user to build.
 */
export class Profile {

  private __workDir: string;
	private __graph: BuildGraph;

	constructor(
    public readonly name: string,
    public readonly path: string,
    public readonly registry: RegistryContext,
    public readonly deps: string[]) {
    this.__graph = new BuildGraph(deps);
	}

  async doConfig(options: ConfigOptions): Promise<void> {
    const { buildDir } = options;
    this.__workDir = join(buildDir, this.name);
    fs.mkdirSync(this.__workDir, { recursive: true });

    const depsFilePath = join(this.__workDir, 'yesbuild.yml');
    this.__graph.staticPools['basePath'] = process.cwd();
    this.__graph.staticPools['configOptions'] = options;
    this.__graph.staticPools['profile'] = this.name;
    this.registry.executeTaskToCollectDeps(this.__graph, this.__workDir);
    // await scanProject(entry, filesDir, platform, this.__graph.tasks.get('default'));
		await this.__build(depsFilePath);
    await this.__graph.dumpToYml(depsFilePath);
  }

	private async __build(ymlPath: string) {
		const taskOptions: RunTaskOptions = {
			forceUpdate: true,
			ymlPath,
			workDir: this.__workDir,
		}
		await runAllTasks(this.__graph, taskOptions);
	}

}
