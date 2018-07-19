import * as assert from "power-assert";
import { parseOwnerAndRepo, withinExpandedTree } from "../../src/binding/expandedTreeUtils";

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
