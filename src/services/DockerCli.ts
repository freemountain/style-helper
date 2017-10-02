import { inject, injectable } from "inversify";
import * as Docker from "dockerode";
import { parse } from "url";

import { IDockerRunOptions, IDockerConfig, IStringMap } from "../interfaces";
import { exec, mapArg } from "../utils";
import { fakeStream, ICommandSF } from "../console";

@injectable()
export class DockerCli {
    private docker: Docker;

    constructor(
        @inject("getDocker") getDocker: () => Docker,
    ) {
        this.docker = getDocker();
    }

    public async pull(image: string, progress: ICommandSF = fakeStream()) {
        await exec({
            command: "gcloud",
            args: ["docker", "--", "pull", image],
            progress: progress.getFactory({ handle: `pull ${image}` })
        });
    }

    public async run(options: IDockerRunOptions, progress: ICommandSF = fakeStream()) {
        const ports = options.ports === true
            ? ["-P"]
            : mapArg((host, container) => ["--publish", `${host}:${container}`], options.ports);

        const labels = mapArg((key, value) => ["--label", `${key}=${value}`], options.labels);
        const envs = mapArg((key, value) => ["--env", `${key}=${value}`], options.env);

        const args = ports.concat(labels).concat(envs);

        if (options.detach) {
            args.unshift("-d");
        }

        if (options.remove) {
            args.unshift("--rm");
        }

        if (options.name) {
            args.unshift(options.name);
            args.unshift("--name");
        }
        args.push(options.image);
        args.unshift("run");

        const { stdout } = await exec({
            command: "docker",
            args,
            progress: progress.getFactory({ handle: `start ${options.image}` })
        });
        return stdout.trim().slice(0, 12);
    }

    public async kill(ids: string[], progress: ICommandSF = fakeStream()) {
        return Promise.all(ids.map(
            (id) => exec({
                command: "docker",
                args: ["rm", "--force", id],
                progress: progress.getFactory({ handle: `kill ${id}` })
            }),
        ));
    }

    public async listContainer(labels: IStringMap<string>, progress: ICommandSF) {
        const args = ["container", "ls"]
            .concat(mapArg((k, v) => ["-f", `label=${k}=${v}`], labels))
            .concat(["--format", "'{{json .ID}}'"]);

        const { stdout } = await exec({
            command: "docker",
            args,
            progress: progress.getFactory({ handle: "list containers" })
        });

        return stdout
            .split("\n")
            .map(s => s.trim())
            .filter(s => s !== "")
            .map(s => s.slice(2, -2));
    }
/*
    public getConfig(): IDockerConfig {
        if (!process.env["DOCKER_HOST"] || !process.env["DOCKER_CERT_PATH"]) {
            throw new Error(`Could not find environment variables DOCKER_HOST or DOCKER_CERT_PATH`);
        }
        const host = parse(process.env["DOCKER_HOST"] as string);

        return {
            host: host.hostname as string,
            port: parseInt(host.port || "2375", 10),
            certPath: process.env["DOCKER_CERT_PATH"] as string,
        };
    }
    */
}
