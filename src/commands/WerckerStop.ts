import { inject, injectable } from "inversify";
import { Argv, Arguments } from "yargs";

import { DockerCli } from "../services";
import { ICommand, ICommandRootStream } from "../console";

@injectable()
export class WerckerStop implements ICommand {
    constructor(
        @inject("DockerCli") private dockerCli: DockerCli,
    ) { }

    public get description() {
        return "stop containers from wercker.yml";
    }

    public get command() {
        return "wercker-stop";
    }

    public options(a: Argv) {
        return a;
    }

    public async execute(argv: Arguments, progress: ICommandRootStream): Promise<void> {
        const ids = await this.dockerCli.listContainer({ LOCAL_WERCKER: "true" }, progress);
        await this.dockerCli.kill(ids, progress);
    }
}
