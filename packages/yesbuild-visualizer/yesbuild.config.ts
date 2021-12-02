import yesbuild, { useEsBuild, useCopy, useTask, useTaskDir, useDevServer } from 'yesbuild';

yesbuild.defineTask('preview', () => useEsBuild({
    entryPoints: ['./src/index.tsx'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    splitting: true,
}));

yesbuild.defineTask('serve', function* () {
  const taskDir = useTaskDir();
  yield useCopy('./assets/index.html', taskDir, {
    relative: './assets/'
  });
  const result = yield useTask('preview');
  return useDevServer({
    mapResults: [result],
  });
});
