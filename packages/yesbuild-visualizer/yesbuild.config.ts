import yesbuild, { uesEsBuild, useParallel, useCopy, useTask, useTaskDir, useDevServer } from 'yesbuild';

yesbuild.defineTask('preview', function*() {
	yield uesEsBuild({
		entryPoints: ['./src/index.tsx'],
		bundle: true,
		format: 'esm',
		platform: 'browser',
		sourcemap: true,
		splitting: true,
	});
});

yesbuild.defineTask('serve', function*() {
	const taskDir = useTaskDir();
	yield useCopy('./assets/index.html', taskDir, {
		relative: './assets/'
	});
  const { products } = yield useTask('esbuild');
  return useDevServer({
    products,
  });
});

yesbuild.defineTask('default', () => useParallel([
	'preview',
]));
