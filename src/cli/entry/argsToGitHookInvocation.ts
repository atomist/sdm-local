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

import { logger } from "@atomist/automation-client";
import { GitHookInvocation } from "../invocation/git/handleGitHookEvent";

/**
 * Process the given args (probably from process.argv) into a
 * GitHookInvocation
 * @param {string[]} argv
 * @return {GitHookInvocation}
 */
export function argsToGitHookInvocation(argv: string[]): GitHookInvocation {
    if (argv.length < 6) {
        logger.info("Not enough args to run Git hook: All args to git hook invocation are %j", argv);
        process.exit(0);
    }

    const args = argv.slice(2);
    const event: string = args[0];
    // We can be invoked in the .git/hooks directory or from the git binary itself
    const baseDir = args[1].replace(/.git[\/hooks]?$/, "")
        .replace(/\/$/, "");
    // TODO this is a bit questionable
    const branch = args[2].replace("refs/heads/", "");
    const sha = args[3];

    // TODO change this
    const teamId = "T123";
    return { event, baseDir, branch, sha, teamId };
}
