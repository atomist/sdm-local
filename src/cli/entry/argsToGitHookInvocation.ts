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

import { logger } from "@atomist/sdm";
import { WorkspaceContextResolver } from "../../common/binding/WorkspaceContextResolver";
import { GitHookInvocation } from "../invocation/git/handleGitHookEvent";

/**
 * Process the given args (probably from process.argv) into a
 * GitHookInvocation
 * @param {string[]} argv command line args
 * @param teamContextResolver resolver to find team id
 * @return {GitHookInvocation}
 */
export function argsToGitHookInvocation(
    argv: string[],
    teamContextResolver: WorkspaceContextResolver,
): GitHookInvocation {

    if (argv.length < 6) {
        logger.error("Not enough arguments to run Git hook, command line: %j", argv);
        process.exit(1);
    }

    const args = (argv[2] === "git-hook") ? argv.slice(3) : argv.slice(2);
    if (args.length < 4) {
        logger.error("Not enough arguments to run Git hook, provided arguments: %j", args);
        process.exit(1);
    }

    const event: string = args[0];
    // We can be invoked in the .git/hooks directory or from the git binary itself
    const baseDir = args[1].replace(/\.git(?:\/hooks)?\/?$/, "").replace(/\/$/, "");
    const branch = args[2].replace("refs/heads/", "");
    const sha = args[3];

    const workspaceId = teamContextResolver.workspaceContext.workspaceId;
    return { event, baseDir, branch, sha, workspaceId };
}
