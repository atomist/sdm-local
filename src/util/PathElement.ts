import * as _ from "lodash";

export interface PathElement {
    name: string;
    kids: PathElement[];
}

export function toPaths(arr: string[][]): PathElement[] {
    if (arr.length === 0) {
        return [];
    }
    const uniq0 = _.uniq(arr.map(a => a[0]));
    return uniq0.map(name => ({
        name,
        kids: toPaths(
            arr.filter(a => a.length > 1 && a[0] === name)
                .map(a => a.slice(1))),
    }));
}
