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
