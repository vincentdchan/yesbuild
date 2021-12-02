import yesbuild, { useEsBuild, useCopy, useTask, useTaskDir, useDevServer } from 'yesbuild';

yesbuild.defineTask('preview', () => useEsBuild({
    entryPoints: ['./src/index.tsx'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    splitting: true,
}));

yesbuild.defineTask('assets', function*() {
  const taskDir = useTaskDir();
  yield useCopy('./assets/*', taskDir, {
    relative: './assets/'
  });
});

yesbuild.defineTask('serve', function* () {
  const assets = yield useTask('assets');
  const preview = yield useTask('preview');
  return useDevServer({
    mapTasks: [assets, preview],
  });
});
