import "reflect-metadata";

import * as Docker from "dockerode";
import { join } from "path";
import { Container, interfaces } from "inversify";
import * as fs from "fs-extra";

import { ICommand, createMain } from "./console";

import { ISettings } from "./interfaces";
import { DockerCli, Wercker } from "./services";
import * as commands from "./commands";

const container = new Container();

container.bind("Init").to(commands.Init);
container.bind("Debug").to(commands.Debug);
container.bind("EnvSet").to(commands.EnvSet);
container.bind("VSCodeAdd").to(commands.VSCodeAdd);
container.bind("WerckerStart").to(commands.WerckerStart);
container.bind("WerckerStop").to(commands.WerckerStop);

container.bind("DockerCli").to(DockerCli);
container.bind("Wercker").to(Wercker);

container.bind<typeof fs>("Fs").toConstantValue(fs);
container.bind<ISettings>("Settings").toConstantValue({
    appDir: join(__dirname, ".."),
});

container.bind<() => Docker>("getDocker").toFactory<Docker>(() => () => {
    return new Docker();
});

container.bind<() => ICommand[]>("getCommands")
    .toFactory((context: interfaces.Context) => () => {
        return Object.keys(commands).map(cmd => context.container.get(cmd));
    });

container.bind("main").toFactory(createMain);

export default container;
