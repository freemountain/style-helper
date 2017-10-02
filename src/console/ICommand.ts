import * as yargs from "yargs";
import { ICommandRootStream } from "./ICommandEventStream";

export interface ICommand {
    options(args: yargs.Argv): yargs.Argv;
    execute(args: yargs.Arguments, stream: ICommandRootStream): Promise<string|void>;
    description: string;
    command: string;
}
