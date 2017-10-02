import { INumberMap, IStringMap } from "./IMap";

export interface IDockerRunOptions {
    detach?: boolean;
    remove?: boolean;
    ports?: INumberMap<number> | true;
    labels?: IStringMap<string>;
    env?: IStringMap<string>;
    image: string;
    name?: string;
}
