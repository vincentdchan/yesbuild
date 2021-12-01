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
