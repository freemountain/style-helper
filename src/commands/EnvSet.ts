import * as Docker from "dockerode";
import { inject, injectable } from "inversify";
import * as R from "ramda";
import { Argv, Arguments } from "yargs";
import { parse } from "path";
import { Wercker } from "../services";
import { ICommand, ICommandRootStream } from "../console";

@injectable()
export class EnvSet implements ICommand {
    private docker: Docker;

    constructor(
        @inject("getDocker") getDocker: () => Docker,
        @inject("Wercker") private wercker: Wercker,

    ) {
        this.docker = getDocker();
    }

    public get description() {
        return "generate shell script with env variables for tests";
    }

    public get command() {
        return "env";
    }

    public options(a: Argv) {
        return a.option("skip-wercker", {
            describe: "skip wercker env variables",
            default: false,
            type: "boolean",
        }).option("skip-path", {
            describe: "skip adding node_modules/.bin to $PATH",
            default: false,
            type: "boolean",
        });
    }

    public async execute(argv: Arguments, stream: ICommandRootStream): Promise<string> {
        let lines: string[] = [];

        if (!argv.skipWercker) {
            lines = R.pipe(
                R.toPairs,
                R.reduce(
                    (acc, [name, value]) => {
                        acc.push(`export ${name}="${value}"`);
                        return acc;
                    },
                    lines,
                ),
            )(await this.wercker.getEnv(stream));
        }

        const PATH = process.env.PATH;
        if (PATH && !argv.skipPath) {
            if (!PATH.split(":").includes("node_modules/.bin")) {
                lines.push(`export PATH="node_modules/.bin:$PATH"`);
            }
        }

        const cmd = parse(process.argv[1]).name
        const args = process.argv.slice(2).join(" ");
        return lines.concat([
            "# Run this command to configure your shell:",
            `# eval $(${[cmd, args].join(" ")})`,
        ]).join("\n") + "\n";
    }

}
