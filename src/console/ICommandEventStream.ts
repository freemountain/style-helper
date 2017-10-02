import { Writable } from "stream";

export interface ICommandSfArguments {
    command?: string;
    handle?: string;
}

export interface ICommandSF {
    getChild(command: string, handle?: string): ICommandEventStream;
    getFactory(predef: ICommandSfArguments): ICommandSF;
}

export interface ICommandRootStream extends ICommandSF {
    stdout: Writable;
    stderr: Writable;
    isRoot: boolean;
    depth: number;
    write(chunk: string, isStdErr: boolean): void;
}

export interface ICommandEventStream extends ICommandRootStream {
    end(code?: number): Promise<void>;
}
