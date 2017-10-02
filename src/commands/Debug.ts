import * as json from "comment-json";
import { readFile } from "fs-extra";
import { injectable, inject } from "inversify";
import { join, relative, resolve, parse } from "path";
import { Argv, Arguments } from "yargs";

import { ICommand, ICommandRootStream } from "../console";
import { exec } from "../utils";
import { Wercker } from "../services";

@injectable()
export class Debug implements ICommand {
    constructor(
        @inject("Wercker") private wercker: Wercker,
    ) {
        //
    }

    public get description() {
        return "node debug wrapper for vscode";
    }

    public get command() {
        return "debug";
    }

    public options(a: Argv) {
        return a.option("workspace", {
            describe: "the project workspace root",
            default: process.cwd(),
            type: "string",
        }).option("debug-brk", {
            describe: "break on first line",
            default: false,
            type: "boolean",
        }).option("inspect", {
            describe: "the debugger port",
            default: 2,
            type: "number",
        }).option("runner", {
            describe: "the runner",
            type: "string",
        });
    }

    public async execute(argv: Arguments, events: ICommandRootStream): Promise<void> {
        const tsconfig = await readFile(join(argv.workspace, "tsconfig.json"));
        const { compilerOptions } = json.parse(tsconfig.toString(), undefined, true);
        const { rootDir, outDir } = compilerOptions;
        const target = argv._[1];

        if (!compilerOptions || !rootDir || !outDir) {
            events.write(`tsconfig needs the following entries: compilerOptions.rootDir, compilerOptions.outDir`, true);
            return;
        }

        if (!target) {
            events.write(`no target`, true);
            return;
        }

        const parsedTarget = parse(target);
        const targetWithoutExtension = join(parsedTarget.dir, parsedTarget.name);
        const absoluteRootDir = resolve(argv.workspace, rootDir);
        const absoluteOutDir = resolve(argv.workspace, outDir);
        const absoluteTarget = resolve(argv.workspace, targetWithoutExtension);
        const relativeTarget = relative(absoluteRootDir, absoluteTarget);
        const outTarget = join(absoluteOutDir, relativeTarget) + ".js";

        const nodeArgs = [`--inspect=${argv.inspect}`];
        if (argv.debugBrk) {
            nodeArgs.push("--debug-brk");
        }
        if (argv.runner) {
            nodeArgs.push(argv.runner);
        }
        nodeArgs.push(outTarget);

        if (argv.runner) {
            argv._.slice(2).forEach(a => nodeArgs.push(a));
        }

        const werckerEnv = await this.wercker.getEnv(events);

        await exec({
            command: "node",
            args: nodeArgs,
            progress: events.getFactory({ handle: "node" }),
            env: { ...process.env, ...werckerEnv },
        });
    }
}
