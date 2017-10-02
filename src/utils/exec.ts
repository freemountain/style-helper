import { spawn } from "child_process";

import { ICommandSF, fakeStream } from "../console";

export interface IExecResult {
    stdout: string;
    stderr: string;
    code: number;
}

export const exec = (options: {
    command: string,
    args: string[],
    progress?: ICommandSF,
    env?: typeof process.env,
}): Promise<IExecResult> => {
    const { command, args } = options;
    const env = options.env  || process.env;
    const cmd = `${command} ${args.join(" ")}`;
    const progressChild = (options.progress || fakeStream()).getChild(cmd);
    const processChild = spawn(command, args, { env });

    const buffer = {
        stdout: "",
        stderr: "",
    };

    processChild.stdout.on("data", (chunk) => {
        const data = chunk.toString();
        buffer.stdout += data;
        if (progressChild) {
            progressChild.stdout.write(data);
        }
    });

    processChild.stderr.on("data", (chunk) => {
        const data = chunk.toString();
        buffer.stderr += data;
        if (progressChild) {
            progressChild.stdout.write(data);
        }
    });

    return new Promise((resolve, reject) => {
        processChild.on("close", (code) => {
            progressChild.end(code);
            resolve({ ...buffer, code });
        });
        processChild.on("error", (error) => {
            progressChild.end(1);
            reject(error);
        });
    }) as Promise<IExecResult>;
};
