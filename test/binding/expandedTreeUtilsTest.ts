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

import * as path from "path";
import * as assert from "power-assert";
import { parseOwnerAndRepo, withinExpandedTree } from "../../src/sdm/binding/project/expandedTreeUtils";

describe("expandedTreeUtils", () => {

    const sep = path.sep;

    describe("parseOwnerAndRepo", () => {

        it("works not within directory tree", () => {
            const base = sep + "usr" + sep + "foo";
            const dir = base + sep + "c" + sep + "d" + sep + "e";
            assert.deepEqual(parseOwnerAndRepo(base, dir), {});
        });

        it("works within directory tree", () => {
            const base = sep + "Users" + sep + "rodjohnson" + sep + "temp" + sep + "local-sdm";
            const dir = base + sep + "spring-team" + sep + "spring-rest-seed";
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: "spring-rest-seed",
            });
        });

        it("works within directory tree under org only", () => {
            const base = sep + "Users" + sep + "rodjohnson" + sep + "temp" + sep + "local-sdm";
            const dir = base + sep + "spring-team";
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: undefined,
            });
        });

        it("works with org with trailing / after repo", () => {
            const base = sep + "Users" + sep + "rodjohnson" + sep + "temp" + sep + "local-sdm";
            const dir = base + sep + "spring-team" + sep + "melb1" + sep;
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: "melb1",
            });
        });

        it("works if base ends with /", () => {
            const base = sep + "Users" + sep + "me" + sep + "projects" + sep;
            const dir = base + "spring-team" + sep + "melb1" + sep;
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: "melb1",
            });
        });
    });

    describe("withinExpandedTree", () => {

        it("works within", () => {
            const base = sep + "usr" + sep + "foo";
            const dirs = ["a" + sep + "b", "c" + sep + "d", "a-thing" + sep + "other-thing"];
            dirs.forEach(d => {
                const dir = base + sep + "" + d;
                assert(withinExpandedTree(base, dir), `${dir} is not within ${base}`);
            });
        });

        it("works not within", () => {
            const base = sep + "usr" + sep + "foo";
            const dirs = ["ab", "c" + sep + "d" + sep + "e", "a-thi" + sep + sep + sep + "ng" + sep + "other-thing"];
            dirs.forEach(d => {
                const dir = base + sep + "" + d;
                assert(!withinExpandedTree(base, dir), `${dir} is not within ${base}`);
            });
        });

    });

});
