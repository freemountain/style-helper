import { Transform } from "stream";

export const createLineSplitter = () => {
    let lineBuffer = "";
    const stream = new Transform({
        transform(buffer, encoding, cb) {
            for (const char of buffer.toString()) {
                if (char !== "\n") {
                    lineBuffer = lineBuffer + char;
                    continue;
                }
                (this as { [key: string]: (chunk: string) => void })["push"](lineBuffer);
                lineBuffer = "";
            }
            cb();
        },
    });

    return stream;
};
