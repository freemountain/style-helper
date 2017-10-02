
export interface ICommandStartEvent {
    type: "start";
    id: string;
    command: string;
    depth: number;
    handle: string;
}

export interface ICommandIOEvent {
    type: "io";
    id: string;
    isStdErr: boolean;
    data: string;
}

export interface ICommandEndEvent {
    type: "end";
    id: string;
    code: number;
}

export type ICommandEvent = ICommandStartEvent|ICommandIOEvent|ICommandEndEvent;
