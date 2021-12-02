
# Contributing

## Bootstrap

Clone the repo

```sh
pnpm install
make
```

## Writing your own ActionExecutor

### Background

Yesbuild's building is the composition
of many actions.

Literally, action is something
to be executed. It has inputs, outputs and dependencies. These three things must be provided of an ActionExecutor.

The input is named `props`.
It's similar to the concept of React's props.
It can be a string, and object, an array...
It can be anything which is serializable because it's persistent.
When the action is determined to re-run,
the props will be passed to the executor again.

The output is named `products`.
The products of an action can be used to another
action. Currently, the products are only allowed
to be a bunch of files because the files are naturally
persistent and easily to track.

The dependencies is named `dependencies`.
Yesbuild allows these types of dependency:

| Literal | Description |
|---------|-------------|
| `*`    | Everything  |
| `undefined` | Nothing |
| 'file://' + path | The path of a file |
| 'task://' + taskName | Another task |

Yesbuild can automatically tracks these dependencis
and decide what actions should be executed.

### Minimal ActionExecutor

I would say, `packages/yesbuild/src/actions/copy.ts`
is a very good example to learn how to write 
an executor.

```typescript

import { ActionExecutor, mount } from 'yesbuild-core';

// defined yout own input, which will be persistent
export interface CopyExecutorProps {
  src: string | string[];
  dest?: string;
}

export class CopyExecutor extends ActionExecutor<CopyExecutorProps> {

  // define the actionName, MUST be the same as your modules's name
  // Yesbuild will find the plugin in node_modules
  public static actionName: string = 'copy'

  public constructor(props: CopyExecutorProps) {
    super(props);
  }

  public async execute(ctx: ExecutionContext): Promise<void> {
      // @Todo
  }
}

// register the action
mount(CopyExecutor);

```

### Construct the dependencies and the products

You can build them use `ctx.depsBuilder` and `ctx.productsBuilder`.

For example:
```typescript
ctx.depsBuilder.dependFile(filename);
```

After that, this file will be added to the dependencies.
