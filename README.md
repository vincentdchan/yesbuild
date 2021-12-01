
# Yesbuild

A scable and extensible build system for the Web ecosystem.

## Features

- Automatically dependencies tracing
- Fast and incremental build
- Parallel
- Simple syntaxes to config
- Easy to composite
- Easy to know what happended
- Full typed plugin API
- Easy to integrate with other bundlers

## Why

Currently, most the bundles hide the details internally.
When the project become large, the dependencies become complex.
There is no way to understand how to optimize the procedures.

Besides, it's hard for a bundler to build incrementally.
A lot of `cache-loader`s are used to implement this,
but it's not very friendly. The users have no idea what
files have been cached.

Yesbuild is a friendly tool for you to make your own building procedures.
It makes your building procedure more reasonable, more easy to
compositing things.

## Install

### Globally

```sh
npm install -g yesbuild
```

### Scoped

```sh
yarn install yesbuild
```

or

```sh
pnpm i yesbuild
```

## Usage

### Quick Start

Make a new file named `yesbuild.config.js` in your project directory.

Define a task:

```typescript
import yesbuild, { uesEsBuild } from 'yesbuild';

yesbuild.defineTask('preview', () => uesEsBuild({
    entryPoints: ['./src/index.tsx'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    splitting: true,
}));
```

Type `yesbuild` in shell to run:

```sh
yesbuild
```

### Simple example to start a dev server

You can easily use the internal actions to build a dev server.

```typescript
import yesbuild, { uesEsBuild, useCopy, useTask, useTaskDir, useDevServer } from 'yesbuild';

// define a task for the preview assets
yesbuild.defineTask('preview', () => uesEsBuild({
    entryPoints: ['./src/index.tsx'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
    splitting: true,
}));

// use the result of the preview task to start a dev server
yesbuild.defineTask('serve', function* () {
  const taskDir = useTaskDir();
  // copy static assets to the task directory,
  yield useCopy('./assets/index.html', taskDir, {
    relative: './assets/'
  });
  const result = yield useTask('preview');  // get the result of preview task
  return useDevServer({
    port: 3000,
    mapResults: [result],
  });
});
```

Type `yesbuild -t serve` to start the server.

Remember, all the dependencies are saved in the files in your `build` directory.
So if they don't changed, nothing will be built next time.

Check `build/yesbuild.preview.yml` and you will know what `yesbuild` has done for you.

## Internal actions

| name | description |
|------|------------|
| useEsBuild | [esbuild](https://github.com/evanw/esbuild/) |
| useCopy | Copy files |
| useParallel | Run tasks in parallel |
| useDevServer | Run a dev server and map files from other tasks |

## External actions

| name | package name | Location |
|------|--------------|----------|
| useTypescript | `@yesbuild/typescript` | `packages/yesbuild-typescript` |

## Write your own action

Check `docs/CONTRIBUTING.md`
