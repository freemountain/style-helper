import { inject, injectable } from "inversify";
import { Argv, Arguments } from "yargs";

import { ICommandRootStream, ICommand } from "../console";

@injectable()
export class Init implements ICommand {

    constructor(
        @inject("EnvSet") private envSet: ICommand,
        @inject("VSCodeAdd") private vsCodeAdd: ICommand,
        @inject("WerckerStart") private werckerStart: ICommand,
    ) {
        //
    }

    public get description() {
        return "init project directory. Will run 'vscode-add', 'wercker-start', 'env'";
    }

    public get command() {
        return "init";
    }

    public options(rootArgs: Argv) {
        let currentArgs = this.vsCodeAdd.options(rootArgs);
        currentArgs = this.werckerStart.options(currentArgs);

        return this.envSet.options(currentArgs).option("skip-wercker", {
            describe: "skip wercker setps",
            default: false,
            type: "boolean",
        }).option("skip-vscode", {
            describe: "skip vscode steps",
            default: false,
            type: "boolean",
        }).option("skip-env", {
            describe: "skip vscode steps",
            default: false,
            type: "boolean",
        });
    }

    public async execute(argv: Arguments, stream: ICommandRootStream): Promise<string | void> {
        const runCommand = async (cmd: ICommand, args: Arguments) => {
            const child = stream.getChild(`${args.$0} ${cmd.command}`);
            const result = await cmd.execute({ ...args, $0: cmd.command }, child);
            await child.end();
            return result;
        }

        if (!argv.skipVscode) {
            await runCommand(this.vsCodeAdd, argv);
        }

        if (!argv.skipWercker) {
            await runCommand(this.werckerStart, argv);
        }

        if (!argv.skipEnv) {
            return runCommand(this.envSet, argv);
        }
    }

}
