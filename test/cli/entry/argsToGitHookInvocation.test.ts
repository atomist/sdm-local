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

import * as ac from "@atomist/automation-client";
import * as assert from "power-assert";
import * as process from "process";
import {
    argsToGitHookInvocation,
    cleanBaseDir,
    cleanBranch,
} from "../../../lib/cli/entry/argsToGitHookInvocation";
import { HookEvent } from "../../../lib/cli/invocation/git/handleGitHookEvent";
import { WorkspaceContextResolver } from "../../../lib/common/binding/WorkspaceContextResolver";

describe("argsToGitHookInvocation", () => {

    const tcr: WorkspaceContextResolver = {
        workspaceContext: {
            workspaceId: "AT0M1ST",
            workspaceName: "Atomist",
        },
    };

    describe("cleanBaseDir", () => {

        it("should directory path alone", () => {
            assert(cleanBaseDir("dir/ectory") === "dir/ectory");
        });

        it("should strip trailing forward slash from directory", () => {
            assert(cleanBaseDir("/path/to/project/") === "/path/to/project");
        });

        it("should strip trailing .git from directory", () => {
            assert(cleanBaseDir("/path/to/project/.git") === "/path/to/project");
        });

        it("should strip trailing .git/hooks/ from directory", () => {
            assert(cleanBaseDir("/path/to/project/.git/hooks/") === "/path/to/project");
        });

        it("should directory alone on win32", () => {
            assert(cleanBaseDir("dir\\ectory") === "dir\\ectory");
        });

        it("should strip trailing back slash from directory", () => {
            assert(cleanBaseDir("C:\\path\\to\\project\\") === "C:\\path\\to\\project");
        });

        it("should strip trailing .git from directory on win32", () => {
            assert(cleanBaseDir("C:\\path\\to\\project\\.git") === "C:\\path\\to\\project");
        });

        it("should strip trailing .git\\hooks\\ from directory", () => {
            assert(cleanBaseDir("A:\\path\\to\\project\\.git\\hooks\\") === "A:\\path\\to\\project");
        });

    });

    describe("cleanBranch", () => {

        it("should strip leave simple branch alone", () => {
            const b = "branch";
            assert(cleanBranch(b) === b);
        });

        it("should strip refs/heads/ from branch", () => {
            assert(cleanBranch("refs/heads/branch") === "branch");
        });

        it("should leave refs/heads/ not at beginning alone", () => {
            const b = "some/other/refs/heads/branch";
            assert(cleanBranch(b) === b);
        });

    });

    describe("atomist-githook", () => {

        let repoPath: string;
        let originalProcessCwd: any;
        before(() => {
            originalProcessCwd = Object.getOwnPropertyDescriptor(process, "cwd");
            Object.defineProperty(process, "cwd", { value: () => repoPath });
        });
        after(() => {
            Object.defineProperty(process, "cwd", originalProcessCwd);
        });

        it("should parse atomist-githook command line", async () => {
            repoPath = "/home/stan/atomist/Own/the-repo";
            const a = ["node", "atomist-githook", HookEvent.PostCommit, repoPath, "branch", "sha"];
            const i = await argsToGitHookInvocation(a, tcr);
            assert.strictEqual(i.event, "post-commit");
            assert.strictEqual(i.baseDir, repoPath);
            assert.strictEqual(i.branch, "branch");
            assert.strictEqual(i.sha, "sha");
            assert.strictEqual(i.workspaceId, tcr.workspaceContext.workspaceId);
        });

        it("should parse atomist-githook command line on win32", async () => {
            repoPath = "L:\\Users\\stan\\atomist\\Own\\the-repo";
            const a = ["node", "atomist-githook", "post-merge", repoPath, "branch", "sha"];
            const i = await argsToGitHookInvocation(a, tcr);
            assert.strictEqual(i.event, HookEvent.PostMerge);
            assert.strictEqual(i.baseDir, repoPath);
            assert.strictEqual(i.branch, "branch");
            assert.strictEqual(i.sha, "sha");
            assert.strictEqual(i.workspaceId, tcr.workspaceContext.workspaceId);
        });

    });

    describe("atomist git-hook ARGS", () => {

        let repoPath: string;
        let originalProcessCwd: any;
        before(() => {
            originalProcessCwd = Object.getOwnPropertyDescriptor(process, "cwd");
            Object.defineProperty(process, "cwd", { value: () => repoPath });
        });
        after(() => {
            Object.defineProperty(process, "cwd", originalProcessCwd);
        });

        it("should parse git-hook command line", async () => {
            repoPath = "/home/stan/atomist/Own/the-repo";
            const a = ["node", "atomist", "git-hook", HookEvent.PostCommit, repoPath, "branch", "sha"];
            const i = await argsToGitHookInvocation(a, tcr);
            assert.strictEqual(i.event, "post-commit");
            assert.strictEqual(i.baseDir, repoPath);
            assert.strictEqual(i.branch, "branch");
            assert.strictEqual(i.sha, "sha");
            assert.strictEqual(i.workspaceId, tcr.workspaceContext.workspaceId);
        });

        it("should parse git-hook post-receive command line", async () => {
            const a = ["node", "atomist", "git-hook", HookEvent.PostReceive, "X:\\Men\\Logan\\projects\\o\\r",
                "other-branch", "074e828a"];
            const i = await argsToGitHookInvocation(a, tcr);
            assert(i.event === "post-receive");
            assert(i.baseDir === repoPath);
            assert(i.branch === "other-branch");
            assert(i.sha === "074e828a");
            assert(i.workspaceId === tcr.workspaceContext.workspaceId);
        });

        it("should parse git-hook command line on win32", async () => {
            repoPath = "L:\\Users\\stan\\atomist\\Own\\the-repo";
            const a = ["node", "atomist", "git-hook", "post-merge", repoPath, "branch", "sha"];
            const i = await argsToGitHookInvocation(a, tcr);
            assert.strictEqual(i.event, HookEvent.PostMerge);
            assert.strictEqual(i.baseDir, repoPath);
            assert.strictEqual(i.branch, "branch");
            assert.strictEqual(i.sha, "sha");
            assert.strictEqual(i.workspaceId, tcr.workspaceContext.workspaceId);
        });

    });

    describe("atomist git-hook", () => {

        const sha = "1234567890abcdef1234567890abcdef12345678";
        const branch = "feature-branch";

        let originalSafeExec: any;
        before(() => {
            originalSafeExec = Object.getOwnPropertyDescriptor(ac, "safeExec");
            Object.defineProperty(ac, "safeExec", {
                value: (cmd: string, args: string[], opts: any) => {
                    if (cmd !== "git") {
                        assert.fail(`Unknown command: ${cmd} ${args.join(" ")}`);
                        return { stdout: "", stderr: "FAIL" };
                    }
                    if (args.length === 3 &&
                        args[0] === "rev-parse" &&
                        args[1] === "--abbrev-ref" &&
                        args[2] === "HEAD") {
                        return { stdout: `refs/heads/${branch}\n`, stderr: "" };
                    } else if (args.length === 2 &&
                        args[0] === "rev-parse" &&
                        args[1] === "HEAD") {
                        return { stdout: `${sha}\n`, stderr: "" };
                    }
                    assert.fail(`Unknown args: ${cmd} ${args.join(" ")}`);
                    return { stdout: "", stderr: "FAIL\n" };
                },
            });
        });
        after(() => {
            Object.defineProperty(ac, "safeExec", originalSafeExec);
        });

        describe("posix", () => {

            let originalProcessCwd: any;
            before(() => {
                originalProcessCwd = Object.getOwnPropertyDescriptor(process, "cwd");
                Object.defineProperty(process, "cwd", { value: () => "/home/stan/atomist/Own/rep" });
            });
            after(() => {
                Object.defineProperty(process, "cwd", originalProcessCwd);
            });

            it("should determine arguments", async () => {
                const a = ["node", "atomist", "git-hook", HookEvent.PostCommit];
                const i = await argsToGitHookInvocation(a, tcr);
                assert(i.event === "post-commit");
                assert(i.baseDir === "/home/stan/atomist/Own/rep");
                assert(i.branch === branch);
                assert(i.sha === sha);
                assert(i.workspaceId === tcr.workspaceContext.workspaceId);
            });

        });

        describe("win32", () => {

            let originalProcessCwd: any;
            before(() => {
                originalProcessCwd = Object.getOwnPropertyDescriptor(process, "cwd");
                Object.defineProperty(process, "cwd", { value: () => "C:\\Users\\Stan\\atomist\\Own\\rep\\.git\\" });
            });
            after(() => {
                Object.defineProperty(process, "cwd", originalProcessCwd);
            });

            it("should determine arguments", async () => {
                const a = ["node", "atomist", "git-hook", HookEvent.PostMerge];
                const i = await argsToGitHookInvocation(a, tcr);
                assert(i.event === "post-merge");
                assert(i.baseDir === "C:\\Users\\Stan\\atomist\\Own\\rep");
                assert(i.branch === branch);
                assert(i.sha === sha);
                assert(i.workspaceId === tcr.workspaceContext.workspaceId);
            });

        });

        describe("post-receive", () => {

            let originalProcessCwd: any;
            let originalProcessStdin: any;
            const baseDir = "C:\\Users\\Stan\\atomist\\Own\\rep";
            before(() => {
                originalProcessCwd = Object.getOwnPropertyDescriptor(process, "cwd");
                Object.defineProperty(process, "cwd", { value: () => `${baseDir}\\.git\\` });
                originalProcessStdin = Object.getOwnPropertyDescriptor(process, "stdin");
                Object.defineProperty(process, "stdin", {
                    value: {
                        on: (event: string, f: any) => {
                            if (event === "data") {
                                f(`oldsha ${sha} ${branch}\n`);
                            } else if (event === "end") {
                                f();
                            }
                        },
                    },
                });
            });
            after(() => {
                Object.defineProperty(process, "cwd", originalProcessCwd);
                Object.defineProperty(process, "stdin", originalProcessStdin);
            });

            it("should determine arguments from stdin", async () => {
                const a = ["node", "atomist", "git-hook", HookEvent.PostReceive];
                const i = await argsToGitHookInvocation(a, tcr);
                assert(i.event === "post-receive");
                assert(i.baseDir === baseDir);
                assert(i.branch === branch);
                assert(i.sha === sha);
                assert(i.workspaceId === tcr.workspaceContext.workspaceId);
            });

        });

    });

});
