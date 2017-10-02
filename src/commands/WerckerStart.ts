import { inject, injectable } from "inversify";
import { join } from "path";
import { Argv, Arguments } from "yargs";

import { ICommandRootStream, ICommand } from "../console";
import { Wercker } from "../services";

@injectable()
export class WerckerStart implements ICommand {

    constructor(
        @inject("Wercker") private wercker: Wercker,
    ) { }

    public get description() {
        return "start containers from wercker.yml";
    }

    public get command() {
        return "wercker-start";
    }

    public options(a: Argv) {
        return a;
    }

    public async execute(a: Arguments, events: ICommandRootStream): Promise<void> {
        const services = await this.wercker.parseYaml(join(process.cwd(), "wercker.yml"));
        await this.wercker.start(services, events);
    }
}
