import * as assert from "assert";
import { GitRemoteParser } from "../../../../src/cli/invocation/command/addCloneCommand";

describe("GitRemoteParser", () => {

    it("should parse GitHub url", () => {
        const url = "https://github.com/spring-team/david1";
        const parsed = GitRemoteParser.firstMatch(url);
        assert(parsed, `Must have matched on [${url}]`);
        assert.equal(parsed.base, "https://github.com");
        assert.equal(parsed.owner, "spring-team");
        assert.equal(parsed.repo, "david1");
    });

    it("should parse GitHub url ending with .git", () => {
        const url = "https://github.com/spring-team/david1.git";
        const parsed = GitRemoteParser.firstMatch(url);
        assert(parsed, `Must have matched on [${url}]`);
        assert.equal(parsed.base, "https://github.com");
        assert.equal(parsed.owner, "spring-team");
        assert.equal(parsed.repo, "david1");
    });

    it("should parse GitHub url with flags", () => {
        const url = "https://github.com/spring-team/david1 --depth=1";
        const parsed = GitRemoteParser.firstMatch(url);
        assert(parsed, `Must have matched on [${url}]`);
        assert.equal(parsed.owner, "spring-team");
        assert.equal(parsed.repo, "david1");
    });

    it("should parse BitBucket ur; ending with .git", () => {
        const url = "https://username@bitbucket.org/teamsinspace/documentation-tests.git";
        const parsed = GitRemoteParser.firstMatch(url);
        assert(parsed, `Must have matched on [${url}]`);
        // TODO parse out the username bit
        assert.equal(parsed.base, "https://username@bitbucket.org");
        assert.equal(parsed.owner, "teamsinspace");
        assert.equal(parsed.repo, "documentation-tests");
    });
});
