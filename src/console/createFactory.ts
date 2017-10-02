import { ICommandSfArguments, ICommandSF, ICommandEventStream } from "./ICommandEventStream";

export const createFactory = (predef: ICommandSfArguments, createChild: ICommandEventStream["getChild"]  ): ICommandSF => ({
    getChild: (command: string, handle: string) => {
        return createChild(predef.command || command, predef.handle || handle );
    },
    getFactory: (args: ICommandSfArguments) => {
        return createFactory({...args, ...predef}, createChild);
    },
});
