/*
 * Copyright © 2019 Atomist, Inc.
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

import { isFailedMatchReport } from "@atomist/microgrammar";
import * as assert from "assert";
import { GitRemoteParser } from "../../../../lib/cli/invocation/command/addCloneCommand";

describe("GitRemoteParser", () => {

    it("should parse GitHub url", () => {
        const url = "https://github.com/spring-team/david1";
        const parsed = GitRemoteParser.firstMatch(url);
        assert(parsed, `Must have matched on [${url}]`);
        assert.strictEqual(parsed.base, "https://github.com");
        assert.strictEqual(parsed.owner, "spring-team");
        assert.strictEqual(parsed.repo, "david1");
    });

    it("should parse GitHub url with http", () => {
        const url = "http://github.com/spring-team/david1";
        const parsed = GitRemoteParser.firstMatch(url);
        assert(parsed, `Must have matched on [${url}]`);
        assert.strictEqual(parsed.base, "http://github.com");
        assert.strictEqual(parsed.owner, "spring-team");
        assert.strictEqual(parsed.repo, "david1");
    });

    it("should parse GitHub url ending with .git", () => {
        const url = "https://github.com/spring-team/david1.git";
        const parsed = GitRemoteParser.firstMatch(url);
        assert(parsed, `Must have matched on [${url}]`);
        assert.strictEqual(parsed.base, "https://github.com");
        assert.strictEqual(parsed.owner, "spring-team");
        assert.strictEqual(parsed.repo, "david1");
    });

    it("should parse GitHub url with flags", () => {
        const url = "https://github.com/spring-team/david1 --depth=1";
        const parsed = GitRemoteParser.firstMatch(url);
        assert(parsed, `Must have matched on [${url}]`);
        assert.strictEqual(parsed.owner, "spring-team");
        assert.strictEqual(parsed.repo, "david1");
    });

    it("should parse GitHub url after flags", () => {
        const url = "--depth=1 https://github.com/spring-team/david1";
        const parsed = GitRemoteParser.firstMatch(url);
        assert(parsed, `Must have matched on [${url}]`);
        assert.strictEqual(parsed.owner, "spring-team");
        assert.strictEqual(parsed.repo, "david1");
    });

    it("should parse BitBucket url ending with .git", () => {
        const url = "https://username@bitbucket.org/teamsinspace/documentation-tests.git";
        const parsed = GitRemoteParser.firstMatch(url);
        assert(parsed, `Must have matched on [${url}]`);
        // TODO parse out the username bit, but this is not urgent
        assert.strictEqual(parsed.base, "https://username@bitbucket.org");
        assert.strictEqual(parsed.owner, "teamsinspace");
        assert.strictEqual(parsed.repo, "documentation-tests");
    });

    it("should parse git protocol", () => {
        const url = "git@github.com:atomist/cli.git";
        const parseReport = GitRemoteParser.perfectMatch(url);
        if (isFailedMatchReport(parseReport)) {
            // console.log(stringifyExplanationTree(parseReport.toExplanationTree()));
            assert.fail(`Must have matched on [${url}]`);
            return;
        }
        const parsed = parseReport.toValueStructure();
        assert.strictEqual(parsed.base, "git@github.com");
        assert.strictEqual(parsed.owner, "atomist");
        assert.strictEqual(parsed.repo, "cli");
    });
});
