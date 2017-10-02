import { Writable } from "stream";
import { ICommandEventStream, ICommandSF } from "./ICommandEventStream";
import { createFactory } from "./createFactory";

const createFakeStream = () => new Writable({
    write: (chunk: any, encoding: any, cb: () => void) => cb(),
});

export class FakeEventStream implements ICommandEventStream {
    private _stdout?: Writable;
    private _stderr?: Writable;

    constructor(
        private parent?: FakeEventStream,
    ) { }

    public get stdout() {
        if (!this._stdout) {
            this._stdout = createFakeStream();
        }
        return this._stdout;
    }

    public get stderr() {
        if (!this._stderr) {
            this._stderr = createFakeStream();
        }

        return this._stderr;
    }

    public get isRoot() {
        return this.parent === undefined;
    }

    public get depth(): number {
        return this.parent !== undefined ? this.parent.depth + 1 : 0;
    }

    public write() {
        // do nothing
    }

    public async end() {
        const endStream = (stream?: Writable) => new Promise((res) => stream ? stream.end(res) : res());
        await Promise.all([endStream(this._stderr), endStream(this._stdout)]);
    }

    public getFactory(): ICommandSF {
        return createFactory({}, () => this.getChild());
    }

    public getChild(): FakeEventStream {
        return new FakeEventStream(this);
    }
}
