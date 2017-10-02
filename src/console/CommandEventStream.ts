import { randomBytes } from "crypto";
import { Stream } from "ts-stream";
import { Writable } from "stream";

import { ICommandEvent, ICommandStartEvent, ICommandEndEvent } from "./events";

import { createFactory } from "./createFactory";
import { createLineSplitter } from "./createLineSplitter";
import { PromisePool } from "./PromisePool";
import { ICommandEventStream, ICommandSF } from "./ICommandEventStream";

export class CommandEventStream implements ICommandEventStream {
    public stdout: Writable;
    public stderr: Writable;
    public stream: Stream<ICommandEvent>;

    private id: string;
    private startEvent?: ICommandStartEvent;
    private endEvent?: ICommandEndEvent;
    private jobs: PromisePool;

    constructor(
        private command: string,
        private handle: string,
        private parent?: CommandEventStream,
    ) {
        this.id = randomBytes(20).toString("hex");
        this.stdout = createLineSplitter();
        this.stderr = createLineSplitter();
        this.jobs = new PromisePool();

        if (this.parent) {
            this.stream = this.parent.stream;
        } else {
            this.stream = new Stream();
        }

        this.stdout.on("data", (data: string) => {
            this.jobs.add(this.stream.write({
                type: "io",
                id: this.id,
                data,
                isStdErr: false,
            }));
        });

        this.stderr.on("data", (data: string) => {
            this.jobs.add(this.stream.write({
                type: "io",
                id: this.id,
                data,
                isStdErr: true,
            }));
        });

        this.startEvent = {
            type: "start",
            handle: this.handle,
            depth: this.depth,
            id: this.id,
            command: this.command,
        };

        this.jobs.add(this.stream.write(this.startEvent));
    }

    public get isRoot() {
        return this.parent === undefined;
    }

    public get depth(): number {
        return this.parent !== undefined ? this.parent.depth + 1 : 0;
    }

    public write(chunk: string, isStdErr: boolean = false) {
        const stream = isStdErr ? this.stderr : this.stdout;
        this.jobs.add(new Promise((resolve) => stream.write(chunk, resolve)));
    }

    public async end(code: number = 0) {
        if (!this.startEvent) {
            throw new Error(`Stream canot end before started id: ${this.id}, cmd: ${this.command}`);
        }
        if (this.endEvent) {
            throw new Error(`Stream already emited end event id: ${this.id}, cmd: ${this.command}`);
        }

        this.endEvent = {
            type: "end",
            id: this.id,
            code,
        };

        this.jobs.add(this.stream.write(this.endEvent));
        await Promise.all([
            new Promise((resolve, reject) => this.stdout.end(resolve)),
            new Promise((resolve, reject) => this.stderr.end(resolve)),
            this.jobs.waitForEnd(),
        ]);

        if (this.isRoot) {
            await this.stream.end();
        }
    }

    public getFactory(predef: { command?: string, handle: string }): ICommandSF {
        return createFactory(predef, this.getChild.bind(this));
    }

    public getChild(command: string, handle: string = command): CommandEventStream {
        return new CommandEventStream(command, handle, this);
    }
}
