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