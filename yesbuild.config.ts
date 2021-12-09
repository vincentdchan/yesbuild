import yesbuild, { useCopy, useTask, useEsBuild, useParallel } from 'yesbuild-core';
import { useTypeScript } from 'yesbuild-typescript';

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

yesbuild.defineTask('solidJsPluginType', function*() {
  yield useTypeScript({
    rootNames: [
      'packages/yesbuild-solidjs/src/index.ts',
    ],
    compilerOptions: {
      'declaration': true,
      'emitDeclarationOnly': true,
    },
  });
  yield useCopy(
    './build/solidJsPluginType/**',
    './packages/yesbuild-solidjs/dist',
    { relative: './build/solidJsPluginType/' });
});

yesbuild.defineTask('solidJsPlugin', function* () {
  yield useEsBuild({
    entryPoints: ['./packages/yesbuild-solidjs/src/index.ts'],
    platform: 'node',
    bundle: true,
    sourcemap: true,
    external: [
      'yesbuild-core',
      '@babel/core',
      '@babel/preset-typescript',
      'babel-preset-solid',
    ],
  });
  yield useCopy(
    './build/solidJsPlugin/**',
    './packages/yesbuild-solidjs/dist',
    { relative: './build/solidJsPlugin/' });
});

yesbuild.defineTask('default', function*() {
  yield useTask('coreType');
  yield useTask('tsPluginType');
  yield useCopy('./README.md', './packages/yesbuild/');
});

yesbuild.defineTask('release', function*() {
  yield useParallel([
    'coreType',
    'tsPluginType',
    'solidJsPlugin',
    'solidJsPluginType',
  ]);
});
