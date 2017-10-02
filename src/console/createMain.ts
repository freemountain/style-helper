import * as yargs from "yargs";

import { CommandEventStream } from "./CommandEventStream";
import { ICommand } from "./ICommand";
import { printStream } from "./printStream";
import { interfaces } from "inversify";

const createExecuteWrapper = (cmd: ICommand, resolve: Function, reject: Function) => async (args: yargs.Arguments) => {
    try {
        console.error(`execute wrapper ${cmd.command}`, args);
        const stream = new CommandEventStream(`${args.$0} ${cmd.command}`, `${args.$0} ${cmd.command}`);
        printStream({
            source: stream.stream,
            sink: process.stderr,
            filterRootCommand: true,
        });

        const result = await cmd.execute(args, stream);
        console.error(`execute ${cmd.command} finished`, result);

        await stream.end();

        console.error(`execute ${cmd.command} stream ended`);

        if (result) {
            await new Promise(resolveWrite => process.stdout.write("\n" + result, resolveWrite));
        }
        resolve();
    } catch (e) {
        reject(e);
    }
}
export const createMain = (context: interfaces.Context) => () => {
    const commandInstances = context.container.get<() => ICommand[]>("getCommands")();
    const validCommands = commandInstances.map(cmd => cmd.command);

    return new Promise((resolve, reject) => {
        const yy = commandInstances
            .reduce((y, cmd) => y.command(
                cmd.command,
                cmd.description,
                cmd.options.bind(cmd),
                createExecuteWrapper(cmd, resolve, reject)
            ), yargs)
            .command("*", "", a => a, a => {
                // tslint:disable-next-line:no-console
                console.error(`Invalid command: ${a._[0]}\nCommands:${validCommands.map(c => `\n  ${c}`).join("")}`);
                resolve();
            })
            .showHelpOnFail(true)
            .help("help")
            .demandCommand(1);

        // tslint:disable-next-line:no-unused-expression
        yy.argv;
    });
};
