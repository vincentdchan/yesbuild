import { ActionExecutor, mount, ExecutionContext } from './common';
import { ChildProcess, fork } from "child_process";

export interface NodeProps {
  prog: string;
  args?: string[];
}

export class Node extends ActionExecutor<NodeProps> {

  public static actionName: string = 'internal:node';

  private child: ChildProcess | undefined;

  public execute(ctx: ExecutionContext) {
    ctx.depsBuilder.addDep("*");
    if (ctx.stage === 1) {
      return;
    }

    const { prog, args } = this.props;

    if (this.child) {
      console.log("kill child process");
      this.child.kill();
    }

    this.child = fork(prog, args ? args : [], {
      stdio: 'inherit',
    });

    this.child.addListener("exit", () => {
      this.child = undefined;
    });
  }

}

mount(Node);
