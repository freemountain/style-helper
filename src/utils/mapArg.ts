import * as R from "ramda";

import { INumberMap, IStringMap } from "../interfaces";

type MapType = number | string;
type Mapping = INumberMap<MapType> | IStringMap<MapType>;

export const mapArg = (
    map: (key: MapType, val: MapType) => string[],
    mapping?: Mapping,
) => R.pipe(
    R.toPairs,
    R.reduce((all: string[], [k, v]: [MapType, MapType]) => all.concat(map(k, v)), []),
)(mapping || {} as Mapping);
