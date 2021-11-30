import yesbuild, { uesEsBuild } from 'yesbuild';

yesbuild.defineTask('default', function*() {
	yield uesEsBuild({
		entryPoints: ['./src/index.tsx'],
		bundle: true,
		format: 'esm',
		platform: 'browser',
		sourcemap: true,
		splitting: true,
	});
});