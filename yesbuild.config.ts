import yesbuild, { uesEsBuild, useParallel,
  useCopy, useTask, useDevServer } from 'yesbuild';
import { useTypeScript } from '@yesbuild/typescript';

yesbuild.defineTask('tsc', () => {
  return useTypeScript({
    rootNames: [
      'packages/yesbuild/src/index.ts',
    ],
    compilerOptions: {
      'declaration': true,
      'emitDeclarationOnly': true,
    },
  });
});

yesbuild.defineTask('release', function*() {
  yield useTask('tsc');
  yield useCopy('./build/tsc/**', './packages/yesbuild/dist');
});

// yesbuild.defineTask('esbuild', () => uesEsBuild({
//   entryPoints: [
//     'packages/yesbuild/src/index.ts',
//   ],
//   bundle: true,
//   platform: 'node',
//   sourcemap: true,
//   external: ['typescript', 'chokidar', 'esbuild']
// }));

// yesbuild.defineTask('default', () => useParallel([
//   'esbuild',
//   'tsc',
// ]));

// yesbuild.defineTask('serve', function*() {
//   yield useCopyFrom('./assets/index.html');
//   const { products } = yield useTask('esbuild');
//   return useDevServer({
//     products,
//   });
// });
