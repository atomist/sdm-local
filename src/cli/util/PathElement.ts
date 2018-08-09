/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as _ from "lodash";

export interface PathElement {
    name: string;
    kids: PathElement[];
}

/**
 * Given the array of string arrays, return all possible
 * paths through. For example, if we have "create spring", "create node" and "create spring kotlin"
 * the result would be [
 *    create -> node
 *           -> spring -> kotlin
 * ]
 * @param {string[][]} arr
 * @return {PathElement[]}
 */
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
