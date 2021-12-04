import { transformAsync, TransformOptions } from '@babel/core';
import ts from '@babel/preset-typescript';
import solid from 'babel-preset-solid';
import { mergeAndConcat } from 'merge-anything';
import * as fs from 'fs';
import * as path from 'path';

// basically from https://github.com/solidjs/vite-plugin-solid/blob/master/src/index.ts
async function transform(source, id, transformOptions) {
  if (!/\.[jt]sx/.test(id)) return null;

  let solidOptions: { generate: 'ssr' | 'dom'; hydratable: boolean };

  // if (options.ssr) {
  //   if (ssr) {
  //     solidOptions = { generate: 'ssr', hydratable: true };
  //   } else {
  //     solidOptions = { generate: 'dom', hydratable: true };
  //   }
  // } else {
  solidOptions = { generate: 'dom', hydratable: false };
  // }

  const projectRoot = process.cwd();  // test

  const opts: TransformOptions = {
    babelrc: false,
    configFile: false,
    root: projectRoot,
    filename: id,
    sourceFileName: id,
    presets: [[solid]],
    // plugins: needHmr ? [[solidRefresh, { bundler: 'vite' }]] : [],
    plugins: [],
    sourceMaps: true,
    // Vite handles sourcemap flattening
    inputSourceMap: false as any,
  };

  if (id.includes('tsx')) {
    opts.presets.push([ts]);
  }

  // Default value for babel user options
  let babelUserOptions: TransformOptions = {};

  // if (options.babel) {
  //   if (typeof options.babel === 'function') {
  //     const babelOptions = options.babel(source, id, ssr);
  //     babelUserOptions = babelOptions instanceof Promise ? await babelOptions : babelOptions;
  //   } else {
  //     babelUserOptions = options.babel;
  //   }
  // }

  const babelOptions = mergeAndConcat(babelUserOptions, opts) as TransformOptions;

  const { code, map } = await transformAsync(source, babelOptions);

  return { code, map };
}

function transformBasename(basename: string): string {
  if (basename.endsWith('.ts')) {
    const prefix = basename.slice(0, basename.length - '.ts'.length);
    return prefix + '.js';
  }

  if (basename.endsWith('.tsx')) {
    const prefix = basename.slice(0, basename.length - '.tsx'.length);
    return prefix + '.js';
  }

  if (basename.endsWith('.jsx')) {
    const prefix = basename.slice(0, basename.length - '.jsx'.length);
    return prefix + '.js';
  }

  return basename;
}

export async function transformSolidJS(filename: string, relative: string, taskDir: string): Promise<[string, number]> {
  const fileContent = fs.readFileSync(filename, 'utf8');
  const relativePath = path.relative(relative, filename);
  const targetPath = path.join(taskDir, relativePath);
  const { code } = await transform(fileContent, relativePath, {});
  const parentPath = path.dirname(targetPath);
  let basename = path.basename(targetPath);
  basename = transformBasename(basename);
  fs.mkdirSync(parentPath, { recursive: true });
  const transformedPath = path.join(parentPath, basename);
  const textEncoder = new TextEncoder();
  const bytes = textEncoder.encode(code);
  await fs.promises.writeFile(transformedPath, bytes);
  return [transformedPath, bytes.length];
}
