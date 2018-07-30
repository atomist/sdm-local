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
import { parseOwnerAndRepo, withinExpandedTree } from "../../src/binding/project/expandedTreeUtils";

describe("expandedTreeUtils", () => {

    describe("parseOwnerAndRepo", () => {

        it("works not within directory tree", () => {
            const base = "/usr/foo";
            const dir = base + "/c/d/e";
            assert.deepEqual(parseOwnerAndRepo(base, dir), {});
        });

        it("works within directory tree", () => {
            const base = "/Users/rodjohnson/temp/local-sdm";
            const dir = base + "/spring-team/spring-rest-seed";
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: "spring-rest-seed",
            });
        });

        it("works within directory tree under org only", () => {
            const base = "/Users/rodjohnson/temp/local-sdm";
            const dir = base + "/spring-team";
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: undefined,
            });
        });

        it("works with org with trailing / after repo", () => {
            const base = "/Users/rodjohnson/temp/local-sdm";
            const dir = base + "/spring-team/melb1/";
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: "melb1",
            });
        });
    });

    describe("withinExpandedTree", () => {

        it("works within", () => {
            const base = "/usr/foo";
            const dirs = ["a/b", "c/d", "a-thing/other-thing"];
            dirs.forEach(d => {
                const dir = base + "/" + d;
                assert(withinExpandedTree(base, dir), `${dir} is not within ${base}`);
            });
        });

        it("works not within", () => {
            const base = "/usr/foo";
            const dirs = ["ab", "c/d/e", "a-thi///ng/other-thing"];
            dirs.forEach(d => {
                const dir = base + "/" + d;
                assert(!withinExpandedTree(base, dir), `${dir} is not within ${base}`);
            });
        });

    });

});
