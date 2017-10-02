import { Promise as TSPromise } from "ts-promise";

const normalizePromise = async <T> (p: TSPromise<T>): Promise<T> => await p;

export class PromisePool {
    private id: number;
    private pool: Map<number, Promise<void>>;
    private result: Promise<void>;

    constructor() {
        this.id = 0;
        this.pool = new Map();
    }

    public add(p: TSPromise<void> | Promise<void>) {
        if (!this.isOpen()) {
            throw new Error("PromisePool is closed");
        }
        const promise = p instanceof TSPromise ? normalizePromise(p) : p;
        const id = ++this.id;
        this.pool.set(id, promise);

        promise
            .catch(() => {
                this.waitForEnd();
            })
            .then(() => this.pool.delete(id));

    }

    public isOpen() {
        return this.result === undefined;
    }

    public waitForEnd() {
        if (!this.result) {
            this.result = Promise.all(this.pool.values()).then(() => undefined);
        }

        return this.result;
    }
}
