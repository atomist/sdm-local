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
import {
    parseOwnerAndRepo,
    withinExpandedTree,
} from "../../lib/sdm/binding/project/expandedTreeUtils";

describe("expandedTreeUtils", () => {

    describe("parseOwnerAndRepo", () => {

        it("works not within directory tree", () => {
            const base = path.join("", "usr", "foo");
            const dir = path.join(base, "c", "d", "e");
            assert.deepEqual(parseOwnerAndRepo(base, dir), {});
        });

        it("works within directory tree", () => {
            const base = path.join("", "Users", "rodjohnson", "temp", "local-sdm");
            const dir = path.join(base, "spring-team", "spring-rest-seed");
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: "spring-rest-seed",
            });
        });

        it("works within directory tree under org only", () => {
            const base = path.join("", "Users", "rodjohnson", "temp", "local-sdm");
            const dir = path.join(base, "spring-team");
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: undefined,
            });
        });

        it("works with org with trailing path separator after repo", () => {
            const base = path.join("", "Users", "rodjohnson", "temp", "local-sdm");
            const dir = path.join(base, "spring-team", "melb1", "");
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: "melb1",
            });
        });

        it("works if base ends with path separator", () => {
            const base = path.join("", "Users", "me", "projects" + path.sep);
            const dir = path.join(base + "spring-team", "melb1" + path.sep);
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: "melb1",
            });
        });
    });

    describe("withinExpandedTree", () => {

        it("works within", () => {
            const base = path.join("", "usr", "foo");
            const dirs = [path.join("a", "b"), path.join("c", "d"), path.join("a-thing", "other-thing")];
            dirs.forEach(d => {
                const dir = path.join(base, "" + d);
                assert(withinExpandedTree(base, dir), `${dir} is not within ${base}`);
            });
        });

        it("works not within", () => {
            const base = path.join("", "usr", "foo");
            const dirs = ["ab", "c", "d", "e", "a-thi", "", "ng", "other-thing"];
            dirs.forEach(d => {
                const dir = path.join(base, "" + d);
                assert(!withinExpandedTree(base, dir), `${dir} is not within ${base}`);
            });
        });

    });

});
