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

import { logger } from "@atomist/automation-client";
import { execPromise } from "@atomist/sdm";
import { WorkspaceContextResolver } from "../../common/binding/WorkspaceContextResolver";
import {
    GitHookInvocation,
    HookEvent,
} from "../invocation/git/handleGitHookEvent";

/**
 * Process the given args (probably from process.argv) into a
 * GitHookInvocation
 * Note that this is not intended for use by humans, but only from our installed git hooks.
 * @param {string[]} argv command line args
 * @param teamContextResolver resolver to find team id
 * @return {GitHookInvocation}
 */
export async function argsToGitHookInvocation(
    argv: string[],
    teamContextResolver: WorkspaceContextResolver,
): Promise<GitHookInvocation> {

    if (argv.length < 3) {
        logger.error("Not enough arguments to run Git hook, command line: %j", argv);
        process.exit(1);
    }
    const args = (argv[2] === "git-hook") ? argv.slice(3) : argv.slice(2);
    const event = args[0];
    if (!event) {
        logger.error("Not enough arguments to run Git hook, provided arguments: %j", args);
        process.exit(1);
    }

    const argBranch = args[2];
    const argSha = args[3];

    // can be invoked in the .git/hooks, .git, or project directory
    const baseDir = cleanBaseDir(process.cwd());
    const workspaceId = teamContextResolver.workspaceContext.workspaceId;

    if (argBranch && argSha) {
        const branch = cleanBranch(argBranch);
        const sha = argSha;
        return { event, baseDir, branch, sha, workspaceId };
    } else {
        if (event === HookEvent.PostReceive) {
            return new Promise<GitHookInvocation>((resolve, reject) => {
                let input: string = "";
                process.stdin.on("data", chunk => {
                    input += chunk.toString();
                });
                process.stdin.on("end", () => {
                    const inputWords = input.trim().split(/\s+/);
                    if (inputWords.length < 3) {
                        const msg = `Git post-receive hook did not receive SHA and branch on standard input`;
                        logger.error(msg);
                        reject(new Error(msg));
                    }
                    // post-receive stdin: before after refname
                    const sha = inputWords[1];
                    const branch = cleanBranch(inputWords[2]);
                    resolve({ event, baseDir, branch, sha, workspaceId });
                });
            });
        } else if (event === HookEvent.PostCommit || event === HookEvent.PostMerge) {
            const gitBranchResult = await execPromise("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: baseDir });
            const branch = cleanBranch(gitBranchResult.stdout.trim());
            const gitShaResult = await execPromise("git", ["rev-parse", "HEAD"], { cwd: baseDir });
            const sha = gitShaResult.stdout.trim();
            return { event, baseDir, branch, sha, workspaceId };
        } else {
            logger.error(`Unrecognized Git hook event: ${event}`);
            process.exit(1);
            return Promise.reject(new Error("Will never get here but TypeScript doesn't know that"));
        }
    }
}

/**
 * Determine project directory from directory which may include .git
 * or .git/hooks.
 *
 * @param dir directory to clean
 * @return base directory with any .git tail and trailing slash removed
 */
export function cleanBaseDir(dir: string): string {
    return dir.replace(/(?:[\/\\]\.git(?:[\/\\]hooks)?)?[\/\\]?$/, "");
}

/**
 * Remove leading refs/heads from Git branch.
 *
 * @param fullBranch complete Git branch specification
 * @return simple branch name
 */
export function cleanBranch(fullBranch: string): string {
    return fullBranch.replace(/^refs\/heads\//, "");
}
