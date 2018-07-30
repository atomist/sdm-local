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


import * as assert from "power-assert";
import { toPaths } from "../../src/util/PathElement";

describe("pathElement", () => {

    it("works with empty", () => {
        const pe = toPaths([]);
        assert.deepEqual(pe, []);
    });

    it("works with one", () => {
        const pe = toPaths([["name"]]);
        assert.deepEqual(pe, [{ name: "name", kids: [] }]);
    });

    it("works with two distinct", () => {
        const pe = toPaths([["name"], ["foo"]]);
        assert.deepEqual(pe, [{ name: "name", kids: [] }, { name: "foo", kids: [] }]);
    });

    it("works with two distinct depth 2", () => {
        const pe = toPaths([["name", "is"], ["foo", "bar"]]);
        assert.deepEqual(pe, [
            { name: "name", kids: [{ name: "is", kids: [] }] },
            { name: "foo", kids: [{ name: "bar", kids: [] }] }]);
    });

    it("works with three overlapping depth 2", () => {
        const pe = toPaths([["name", "is"], ["name", "bar"], ["foo", "bar"]]);
        assert.deepEqual(pe, [
            { name: "name", kids: [
                { name: "is", kids: [] }, { name: "bar", kids: [] }] },
            { name: "foo", kids: [{ name: "bar", kids: [] }] }]);
    });
});
