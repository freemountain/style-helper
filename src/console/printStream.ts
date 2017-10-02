import * as chalk from "chalk";
import * as R from "ramda";

import { ICommandStartEvent, ICommandIOEvent, ICommandEndEvent, ICommandEvent } from "./events";
import { Stream } from "ts-stream";
import { Writable } from "stream";

export const printStream = (arg: {
    source: Stream<ICommandEvent>,
    sink: Writable | NodeJS.WritableStream
    endSink?: boolean,
    filterRootCommand?: boolean,
}) => {
    const started: Map<string, ICommandStartEvent> = new Map();
    const doubleStart: ICommandStartEvent[] = [];
    const noStart: (ICommandEndEvent | ICommandIOEvent)[] = [];
    const terminalWidth = process.stdout.columns || 120;

    return arg.source
        .filter((event) => {
            if (event.type === "start") {
                if (started.has(event.id)) {
                    doubleStart.push(event);
                    return false;
                }
                started.set(event.id, event);
                return true;
            }
            const startEvent = started.get(event.id);

            if (!startEvent) {
                noStart.push(event);
                return false;
            }

            return true;
        })
        .map((event) => {
            const startEvent = event.type === "start" ? event : started.get(event.id) as ICommandStartEvent;
            const depth = startEvent.depth - (arg.filterRootCommand && startEvent.depth !== 0 ? 1 : 0);
            const handle = R.repeat(" ", depth).join("") + chalk.bold("[", startEvent.handle, "]");

            let symbol: string;
            let chunk: string;

            if (event.type === "end") {
                started.delete(event.id);
            }

            if (arg.filterRootCommand && event.type !== "io" && startEvent.depth === 0) {
                return null;
            }

            if (event.type === "end" && event.code === 0) {
                return null;
            }

            if (event.type === "start") {
                chunk = chalk.italic.bold(event.command);
                symbol = ">>";
            } else if (event.type === "io") {
                chunk = event.data;
                symbol = "<<";
            } else {
                chunk = event.code.toString();
                symbol = "returned";
            }

            return { handle, symbol: chalk.blue(symbol), chunk };
        }).map((event: { handle: string, chunk: string, symbol: string }) => {
            if (!event) {
                return "";
            }
            const { handle, chunk, symbol } = event;

            const spaceLeftForLine = terminalWidth - (handle.length + symbol.length);
            if(spaceLeftForLine < 5) {
                return handle + " " + symbol + " " + chunk + "\n";
            }
            const symbolPlaceholder = R.repeat(" ", symbol.length).join("");
            const lines: any[] = R.splitEvery(spaceLeftForLine, chunk as any);
            return (lines as string[]).map((line, index) => {
                const middle = index === 0 ? symbol : symbolPlaceholder;
                return handle + " " + middle + " " + line + "\n";
            }).join("");
        }).forEach(chunk => new Promise((resolve) => {
            if (arg.sink instanceof Writable) {
                arg.sink.write(chunk, resolve);
            } else {
                arg.sink.write(chunk, resolve);
            }

        }),        () => new Promise((resolve) => {
            if (!arg.endSink) {
                return resolve();
            }

            if (arg.sink instanceof Writable) {
                return arg.sink.end(resolve);
            }
            arg.sink.end();
            resolve();
        }));
};
