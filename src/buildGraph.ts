import { isObjectLike } from 'lodash-es';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

const YML_VERSION = '1.0';

export interface ActionStore {
  name: string,
  params?: any;
}


interface StaticPoolMap {
  [path: string]: any;
}

export interface TaskOutput {
  deps: string[];
}

export function makeTaskOutput(): TaskOutput {
  return {
    deps: [],
  };
}

export interface TaskNode {
  actions: ActionStore[],
  outputs: string[];
  deps: string[];
}

export function makeTaskNode(): TaskNode {
  return {
    actions: [],
    outputs: Object.create(null),
    deps: [],
  };
}

export class BuildGraph {

	/**
	 * Static Pools is anything static for this Build Procedure,
	 * can be used as key to the tasks
	 */
	public readonly staticPools: StaticPoolMap = Object.create(null);
  public readonly tasks: Map<string, TaskNode> = new Map();

	public static fromJSON(objs: any): BuildGraph {
		if (!isObjectLike(objs)) {
			throw new Error(`ModuleGraph::fromJSON only received object, but got ${objs}`);
		}

    const result = new BuildGraph();

		if (!isObjectLike(objs['static'])) {
			throw new Error(`ModuleGraph::fromJSON objs.deps not found`);
		}

    Object.assign(result.staticPools, objs['static']);

    for (const key in objs.tasks) {
      const value = objs.tasks[key];
      result.tasks.set(key, value);
    }

    return result;
	}

	public constructor(public readonly deps: string[] = []) {
	}

  public async dumpToYml(path: string): Promise<any> {
		const objs: any = Object.create(null);
    objs['version'] = YML_VERSION;
    this.dumpStaticPools(objs);
    this.dumpTasks(objs);
    objs['deps'] = this.deps;

		const result = yaml.dump(objs);

    await fs.promises.writeFile(path, result);
  }

  private dumpTasks(objs: any) {
    const tasks: any = Object.create(null);

    for (const [key, value] of this.tasks) {
      tasks[key] = value;
    }

    objs["tasks"] = tasks;
  }

  private dumpStaticPools(objs: any) {
    objs['static'] = this.staticPools;
  }

}
