
export class GraphNode {

	public readonly depsPath: string[] = [];

	public constructor(
		public readonly path: string
	) {

	}

	public toDepJson(): any {
		return {
			deps: this.depsPath,
		};
	}

}

export class ModuleGraph {

	public readonly pathToNodes: Map<string, GraphNode> = new Map();

	public constructor() {

	}

	public addNode(node: GraphNode) {
		this.pathToNodes.set(node.path, node);
	}

	public toDepJson(): any {
		const objs: any = {};

		for (const [key, value] of this.pathToNodes) {
			objs[key] = value.toDepJson();
		}

		return objs;
	}

}
