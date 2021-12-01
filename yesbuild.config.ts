import yesbuild, { useCopy, useTask } from 'yesbuild';
import { useTypeScript } from '@yesbuild/typescript';

yesbuild.defineTask('coreType', function*() {
  yield useTypeScript({
    rootNames: [
      'packages/yesbuild/src/index.ts',
    ],
    compilerOptions: {
      'declaration': true,
      'emitDeclarationOnly': true,
    },
  });
  yield useCopy(
    './build/coreType/**',
    './packages/yesbuild/dist',
    { relative: './build/coreType/' });
});

yesbuild.defineTask('tsPluginType', function*() {
  yield useTypeScript({
    rootNames: [
      'packages/yesbuild-typescript/index.ts',
    ],
    compilerOptions: {
      'declaration': true,
      'emitDeclarationOnly': true,
    },
  });
  yield useCopy(
    './build/tsPluginType/**',
    './packages/yesbuild-typescript/dist',
    { relative: './build/tsPluginType/' });
});

yesbuild.defineTask('default', function*() {
  yield useTask('coreType');
  yield useTask('tsPluginType');
  yield useCopy('./README.md', './packages/yesbuild/');
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
