import { inject, injectable } from "inversify";
import { inspect } from "util";

import { Argv, Arguments } from "yargs";
import * as Fs from "fs-extra";
import {  ISettings } from "../interfaces";
import { join } from "path";

import { ICommandRootStream, ICommand } from "../console";

@injectable()
export class VSCodeAdd implements ICommand {

    constructor(
        @inject("Fs") private fs: typeof Fs,
        @inject("Settings") private settings: ISettings,
    ) {
    }

    public get description() {
        return "add .vscode folder";
    }

    public get command() {
        return "vscode-add";
    }

    public options(a: Argv) {
        return a.option("workspace", {
            describe: "the project workspace root",
            default: process.cwd(),
            type: "string",
        });
    }

    public async execute(argv: Arguments, stream: ICommandRootStream): Promise<void> {
        const destination = join(argv.workspace, ".vscode");
        const source = join(this.settings.appDir, ".vscode");
        const child = stream.getChild(`cp -R ${source} ${destination}`, "copy .vscode");
        let code = 0;
        try {
            await this.fs.copy(source, destination);
        } catch (e) {
            code = 1;
            child.write(inspect(e), true);
        }

        await child.end(code);
    }
}
