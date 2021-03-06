import * as Docker from "dockerode";
import * as Fs from "fs-extra";
import { inject, injectable } from "inversify";
import * as yaml from "js-yaml";
import { join } from "path";
import * as R from "ramda";

import { IStringMap, IWerckerService, ISettings } from "../interfaces";
import { DockerCli } from "../services";
import { fakeStream, ICommandSF } from "../console";

interface IKeyValue<K, V> {
    key: K;
    value: V;
}

@injectable()
export class Wercker {
    private settings: ISettings;

    constructor(
        @inject("DockerCli") private dockerCli: DockerCli,
        @inject("Fs") private fs: typeof Fs,
        @inject("getSettings") private getSettings: () => ISettings,
    ) {
        this.settings = getSettings();
    }

    public async getEnv(progress: ICommandSF = fakeStream()): Promise<IStringMap<string>> {
        const ids = await this.dockerCli.listContainer({ LOCAL_WERCKER: "true" }, progress);
        //const config = this

        return ids.reduce(
            async (next: Promise<IStringMap<string>>, id: string) => {
                const all: IStringMap<string> = await next;
                //const container = this.docker.getContainer(id);
                const info = await this.dockerCli.inspect(id);
                const name = info.Name.slice(9);

                return { ...all, ...this.generateServiceEnv(this.settings.docker, name, info) };
            },
            Promise.resolve({} as IStringMap<string>),
        );
    }

    public async parseYaml(pathToYml: string): Promise<IWerckerService[]> {
        const werckerFile = await this.fs.readFile(join(process.cwd(), "wercker.yml"));
        const werckerConfig = yaml.safeLoad(werckerFile.toString());
        const services: IWerckerService[] = werckerConfig.services ? werckerConfig.services : [];

        return services.map(service => {
            const name = service.name || service.id.split("/").slice(-1).join("");
            return ({ ...service, id: this.normalizeImage(service.id), name })
        });

    }

    public async start(services: IWerckerService[], progress: ICommandSF = fakeStream()) {
        await Promise.all(services.map(async service => {
            const image = this.getImageTag(service);
            await this.dockerCli.pull(image, service.registry, progress);
        }));

        return Promise.all(services.map(async (service) => {
            const image = this.getImageTag(service);
            await this.dockerCli.run(
                {
                    image,
                    detach: true,
                    remove: true,
                    env: service.env,
                    ports: true,
                    name: `wercker-${service.name}`,
                    labels: {
                        LOCAL_WERCKER: "true",
                    },
                },
                progress.getFactory({handle: `start ${service.name}`}),
            );
        }));
    }

    private getImageTag(service: IWerckerService) {
        return service.tag ? `${service.id}:${service.tag}` : service.id;
    }

    private generateServiceEnv(ip: string, name: string, info: Docker.ContainerInspectInfo) {
        const upperCaseName = name.toUpperCase();
        const r: IStringMap<string> = R.pipe(
            R.toPairs,
            R.map(([portAndProto, m]: [string, IStringMap<string>[]]) => {
                const [exposedPort, proto] = portAndProto.split("/");
                const { HostPort } = m[0];
                const prefix = `${upperCaseName}_PORT_${exposedPort}_${proto.toUpperCase()}`;

                return [
                    { key: `${prefix}_ADDR`, value: ip },
                    { key: `${prefix}_PORT`, value: HostPort },
                ] as IKeyValue<string, string>[];
            }),
            (e: IKeyValue<string, string>[][]) => R.flatten<IKeyValue<string, string>>(e),
            R.reduce((acc, element) => ({ ...acc, [element.key]: element.value }), {}),
        )(info.NetworkSettings.Ports);

        return r;
    }

    private normalizeImage(image: string) {
        return image.split("/").map(part => {
            if (!part.startsWith("$")) {
                return part;
            }
            const name = part.slice(1);
            const env = process.env[name];

            if (!env) {
                throw new Error(`You need to define env variable $${name}`);
            }
            return env;
        }).join("/");
    }
}
