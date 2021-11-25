import {
	build as esbuild,
	BuildOptions as EsBuildOptions,
	Plugin as EsBuildPlugin,
	OnResolveArgs as EsBuildResolveArgs,
	Metafile as EsMetaFile,
} from 'esbuild';
import { GraphNode, ModuleGraph } from './moduleGraph';

function generateScanPlugin(entry: string, graph: ModuleGraph): EsBuildPlugin {
	return {
		name: 'yesbuild:scan',
		setup: (build) => {
			build.onResolve({ filter: /.,*/ }, (args: EsBuildResolveArgs) => {
				// console.log(`data: ${JSON.stringify(args, null, 2)}`)
				return {};
			});
		},
	};
}

export async function scanProject(entry: string, outdir: string, platform: string, graph: ModuleGraph) {
	const esBuildOptions: EsBuildOptions = {
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		logLevel: 'error',
		splitting: true,
		outdir,
		sourcemap: true,
		platform: platform as any,
		metafile: true,
		plugins: [
			generateScanPlugin(entry, graph)
		]
	};

	const result = await esbuild(esBuildOptions);
	const metafile = result.metafile!;
	buildGraphFromEsBuild(metafile, graph);
}

function buildGraphFromEsBuild(metafile: EsMetaFile, graph: ModuleGraph) {
	const { outputs } = metafile;
	for (const key of Object.keys(outputs)) {
		const output = outputs[key];
		const node = new GraphNode(key);

		for (const dep of Object.keys(output.inputs)) {
			node.depsPath.push(dep);
		}

		graph.addNode(node);
	}
}
