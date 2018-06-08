import * as assert from "power-assert";
import { parseOwnerAndRepo, withinExpandedTree } from "../../src/binding/expandedTreeUtils";

describe("expandedTreeUtils", () => {

    describe("parseOwnerAndRepo", () => {

        it("works not within", () => {
            const base = "/usr/foo";
            const dir = base + "/c/d/e";
            assert.deepEqual(parseOwnerAndRepo(base, dir), {});
        });

        it("works within", () => {
            const base = "/Users/rodjohnson/temp/local-sdm";
            const dir = base + "/spring-team/spring-rest-seed";
            assert.deepEqual(parseOwnerAndRepo(base, dir), {
                owner: "spring-team",
                repo: "spring-rest-seed",
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
