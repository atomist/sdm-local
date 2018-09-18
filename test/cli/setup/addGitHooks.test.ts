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

import * as assert from "power-assert";

import {
    InMemoryProject,
} from "@atomist/automation-client";
import {
    LocalProject,
} from "@atomist/sdm";
import * as os from "os";
import * as path from "path";

import {
    addGitHooksToProject,
    deatomizeScript,
    markAsAtomistContent,
    reatomizeScript,
    removeGitHooksFromProject,
} from "../../../lib/cli/setup/addGitHooks";

/* tslint:disable:max-file-line-count */

describe("addGitHooks", () => {

    describe("reatomizeScript", () => {

        it("should add hook to project", async () => {
            const p = InMemoryProject.of({ path: path.join(".git", "hooks", "README"), content: "# Something\n" });
            (p as any).baseDir = process.cwd();
            const s = path.join(".git", "hooks", "pre-commit");
            const c = markAsAtomistContent("\ndo something Atomist-y\n");
            await reatomizeScript(p as any as LocalProject, s, c);
            const f = await p.getFile(s);
            const n = await f.getContent();
            const e = `#!/bin/sh

######## Atomist start ########

do something Atomist-y

######### Atomist end #########
`;
            assert.strictEqual(n, e);
        });

        it("should update hook in project", async () => {
            const s = path.join(".git", "hooks", "pre-commit");
            const p = InMemoryProject.of({ path: s, content: `#!/bin/sh\necho "Hello, world!"\n` });
            (p as any).baseDir = process.cwd();
            const c = markAsAtomistContent("\ndo something Atomist-y\n");
            await reatomizeScript(p as any as LocalProject, s, c);
            const f = await p.getFile(s);
            const n = await f.getContent();
            const e = `#!/bin/sh
echo "Hello, world!"

######## Atomist start ########

do something Atomist-y

######### Atomist end #########
`;
            assert.strictEqual(n, e);
        });

        it("should update Atomist hook content in project", async () => {
            const s = path.join(".git", "hooks", "pre-commit");
            const o = `#!/bin/sh
echo "Hello, world!"

######## Atomist start ########

old Atomist content

######### Atomist end #########

echo "Goodbye, World!"
`;

            const p = InMemoryProject.of({ path: s, content: o });
            (p as any).baseDir = process.cwd();
            const c = markAsAtomistContent("\ndo something Atomist-y\n");
            await reatomizeScript(p as any as LocalProject, s, c);
            const f = await p.getFile(s);
            const n = await f.getContent();
            const e = `#!/bin/sh
echo "Hello, world!"

######## Atomist start ########

do something Atomist-y

######### Atomist end #########

echo "Goodbye, World!"
`;
            assert.strictEqual(n, e);
        });

        it("should update Atomist hook content in sloppy hook script", async () => {
            const s = path.join(".git", "hooks", "pre-commit");
            const o = `#!/bin/sh
echo "Hello, world!"
############### Atomist start ###

old Atomist content

# Atomist end #######################
echo "Goodbye, World!"
`;

            const p = InMemoryProject.of({ path: s, content: o });
            (p as any).baseDir = process.cwd();
            const c = markAsAtomistContent("\ndo something Atomist-y\n");
            await reatomizeScript(p as any as LocalProject, s, c);
            const f = await p.getFile(s);
            const n = await f.getContent();
            const e = `#!/bin/sh
echo "Hello, world!"
######## Atomist start ########

do something Atomist-y

######### Atomist end #########
echo "Goodbye, World!"
`;
            assert.strictEqual(n, e);
        });

        it("should do nothing if content is the same", async () => {
            const s = path.join(".git", "hooks", "pre-commit");
            const o = `#!/bin/sh
echo "Hello, world!"

######## Atomist start ########

do something Atomist-y

######### Atomist end #########

echo "Goodbye, World!"
`;

            const p = InMemoryProject.of({ path: s, content: o });
            (p as any).baseDir = process.cwd();
            const c = markAsAtomistContent("\ndo something Atomist-y\n");
            await reatomizeScript(p as any as LocalProject, s, c);
            const f = await p.getFile(s);
            const n = await f.getContent();
            assert.strictEqual(n, o);
        });

        it("should not add Atomist content twice", async () => {
            const s = path.join(".git", "hooks", "pre-commit");
            const c = markAsAtomistContent("\ndo something Atomist-y\n");
            const p = InMemoryProject.of({ path: s, content: c });
            (p as any).baseDir = process.cwd();
            await reatomizeScript(p as any as LocalProject, s, c);
            const f = await p.getFile(s);
            const n = await f.getContent();
            assert.strictEqual(n, c);
        });

        it("should append when end comment is missing", async () => {
            const s = path.join(".git", "hooks", "pre-commit");
            const o = `#!/bin/sh
echo "Hello, world!"

######## Atomist start ########

bad Atomist content

echo "Goodbye, World!"
`;
            const p = InMemoryProject.of({ path: s, content: o });
            (p as any).baseDir = process.cwd();
            const c = markAsAtomistContent("\ndo something Atomist-y\n");
            await reatomizeScript(p as any as LocalProject, s, c);
            const f = await p.getFile(s);
            const n = await f.getContent();
            const e = `#!/bin/sh
echo "Hello, world!"

######## Atomist start ########

bad Atomist content

echo "Goodbye, World!"

######## Atomist start ########

do something Atomist-y

######### Atomist end #########
`;
            assert.strictEqual(n, e);
        });

        it("should append when start comment is missing", async () => {
            const s = path.join(".git", "hooks", "pre-commit");
            const o = `#!/bin/sh
echo "Hello, world!"

bad Atomist content

######### Atomist end #########

echo "Goodbye, World!"
`;
            const p = InMemoryProject.of({ path: s, content: o });
            (p as any).baseDir = process.cwd();
            const c = markAsAtomistContent("\ndo something Atomist-y\n");
            await reatomizeScript(p as any as LocalProject, s, c);
            const f = await p.getFile(s);
            const n = await f.getContent();
            const e = `#!/bin/sh
echo "Hello, world!"

bad Atomist content

######### Atomist end #########

echo "Goodbye, World!"

######## Atomist start ########

do something Atomist-y

######### Atomist end #########
`;
            assert.strictEqual(n, e);
        });

    });

    describe("deatomizeScript", () => {

        it("should remove Atomist hook content from project", async () => {
            const s = path.join(".git", "hooks", "post-commit");
            const o = `#!/bin/sh
echo "Hello, world!"

######## Atomist start ########

old Atomist content

######### Atomist end #########
echo "Goodbye, World!"
`;

            const p = InMemoryProject.of({ path: s, content: o });
            (p as any).baseDir = process.cwd();
            await deatomizeScript(p as any as LocalProject, s);
            const f = await p.getFile(s);
            const n = await f.getContent();
            const e = `#!/bin/sh
echo "Hello, world!"
echo "Goodbye, World!"
`;
            assert.strictEqual(n, e);
        });

        it("should remove Atomist hook content from sloppy hook", async () => {
            const s = path.join(".git", "hooks", "post-commit");
            const o = `#!/bin/sh
echo "Hello, world!"
############################# Atomist start #

old Atomist content

# Atomist end ###############################

echo "Goodbye, World!"
`;

            const p = InMemoryProject.of({ path: s, content: o });
            (p as any).baseDir = process.cwd();
            await deatomizeScript(p as any as LocalProject, s);
            const f = await p.getFile(s);
            const n = await f.getContent();
            const e = `#!/bin/sh
echo "Hello, world!"
echo "Goodbye, World!"
`;
            assert.strictEqual(n, e);
        });

        it("should do nothing if no Atomist content", async () => {
            const s = path.join(".git", "hooks", "pre-commit");
            const o = `#!/bin/sh
echo "Hello, world!"

echo "Goodbye, World!"
`;

            const p = InMemoryProject.of({ path: s, content: o });
            (p as any).baseDir = process.cwd();
            await deatomizeScript(p as any as LocalProject, s);
            const f = await p.getFile(s);
            const n = await f.getContent();
            assert.strictEqual(n, o);
        });

        it("should not remove when end comment is missing", async () => {
            const s = path.join(".git", "hooks", "pre-commit");
            const o = `#!/bin/sh
echo "Hello, world!"

######## Atomist start ########

old Atomist content

echo "Goodbye, World!"
`;

            const p = InMemoryProject.of({ path: s, content: o });
            (p as any).baseDir = process.cwd();
            await deatomizeScript(p as any as LocalProject, s);
            const f = await p.getFile(s);
            const n = await f.getContent();
            assert.strictEqual(n, o);
        });

        it("should not remove when start comment is missing", async () => {
            const s = path.join(".git", "hooks", "pre-commit");
            const o = `#!/bin/sh
echo "Hello, world!"

old Atomist content

######### Atomist end #########

echo "Goodbye, World!"
`;

            const p = InMemoryProject.of({ path: s, content: o });
            (p as any).baseDir = process.cwd();
            await deatomizeScript(p as any as LocalProject, s);
            const f = await p.getFile(s);
            const n = await f.getContent();
            assert.strictEqual(n, o);
        });

    });

    describe("addGitHooksToProject", () => {

        describe("win32", () => {

            // tslint:disable:no-invalid-this
            before(function() {
                this.originalOsPlatform = Object.getOwnPropertyDescriptor(os, "platform");
                Object.defineProperty(os, "platform", {
                    value: () => "win32",
                });
            });
            after(function() {
                Object.defineProperty(os, "platform", this.originalOsPlatform);
            });
            // tslint:enable:no-invalid-this

            it("should add hooks to project", async () => {
                const p = InMemoryProject.of();
                (p as any).baseDir = process.cwd();
                (p as any).makeExecutable = (pth: string) => Promise.resolve(p);
                await addGitHooksToProject(p as any as LocalProject);
                for (const h of ["post-commit", "post-merge"]) {
                    const s = path.join(".git", "hooks", h);
                    const f = await p.findFile(s);
                    const n = await f.getContent();
                    const e = `#!/bin/sh

######## Atomist start ########

sha=\`git rev-parse HEAD\`
branch=\`git rev-parse --abbrev-ref HEAD\`
atomist git-hook ${h} "$PWD" "$branch" "$sha"

######### Atomist end #########
`;
                    assert.strictEqual(n, e);
                }
                for (const h of ["post-receive"]) {
                    const s = path.join(".git", "hooks", h);
                    const f = await p.findFile(s);
                    const n = await f.getContent();
                    const e = `#!/bin/sh

######## Atomist start ########

ATOMIST_GITHOOK_VERBOSE=true
export ATOMIST_GITHOOK_VERBOSE
read oldrev newrev refname
atomist git-hook post-receive "$PWD" "$refname" "$newrev"

######### Atomist end #########
`;
                    assert.strictEqual(n, e);
                }
            });

            it("should add content to project hooks", async () => {
                const p = InMemoryProject.of(...hooks.map(h => ({
                    path: path.join(".git", "hooks", h),
                    content: `#!/bin/sh\necho ${h}\n`,
                })));
                (p as any).baseDir = process.cwd();
                (p as any).makeExecutable = (pth: string) => Promise.resolve(p);
                await addGitHooksToProject(p as any as LocalProject);
                for (const h of ["post-commit", "post-merge"]) {
                    const s = path.join(".git", "hooks", h);
                    const f = await p.findFile(s);
                    const n = await f.getContent();
                    const e = `#!/bin/sh
echo ${h}

######## Atomist start ########

sha=\`git rev-parse HEAD\`
branch=\`git rev-parse --abbrev-ref HEAD\`
atomist git-hook ${h} "$PWD" "$branch" "$sha"

######### Atomist end #########
`;
                    assert.strictEqual(n, e);
                }
                for (const h of ["post-receive"]) {
                    const s = path.join(".git", "hooks", h);
                    const f = await p.findFile(s);
                    const n = await f.getContent();
                    const e = `#!/bin/sh
echo ${h}

######## Atomist start ########

ATOMIST_GITHOOK_VERBOSE=true
export ATOMIST_GITHOOK_VERBOSE
read oldrev newrev refname
atomist git-hook post-receive "$PWD" "$refname" "$newrev"

######### Atomist end #########
`;
                    assert.strictEqual(n, e);
                }
            });

        });

        describe("posix", () => {

            // tslint:disable:no-invalid-this
            before(function() {
                this.originalOsPlatform = Object.getOwnPropertyDescriptor(os, "platform");
                Object.defineProperty(os, "platform", {
                    value: () => "darwin",
                });
            });
            after(function() {
                Object.defineProperty(os, "platform", this.originalOsPlatform);
            });
            // tslint:enable:no-invalid-this

            it("should add hooks to project", async () => {
                const p = InMemoryProject.of();
                (p as any).baseDir = process.cwd();
                (p as any).makeExecutable = (pth: string) => Promise.resolve(p);
                await addGitHooksToProject(p as any as LocalProject);
                for (const h of ["post-commit", "post-merge"]) {
                    const s = path.join(".git", "hooks", h);
                    const f = await p.findFile(s);
                    const n = await f.getContent();
                    const e = `#!/bin/sh

######## Atomist start ########

sha=\`git rev-parse HEAD\`
branch=\`git rev-parse --abbrev-ref HEAD\`
atomist git-hook ${h} "$PWD" "$branch" "$sha" &

######### Atomist end #########
`;
                    assert.strictEqual(n, e);
                }
                for (const h of ["post-receive"]) {
                    const s = path.join(".git", "hooks", h);
                    const f = await p.findFile(s);
                    const n = await f.getContent();
                    const e = `#!/bin/sh

######## Atomist start ########

ATOMIST_GITHOOK_VERBOSE=true
export ATOMIST_GITHOOK_VERBOSE
read oldrev newrev refname
atomist git-hook post-receive "$PWD" "$refname" "$newrev" &

######### Atomist end #########
`;
                    assert.strictEqual(n, e);
                }
            });

            it("should add content to project hooks", async () => {
                const p = InMemoryProject.of(...hooks.map(h => ({
                    path: path.join(".git", "hooks", h),
                    content: `#!/bin/sh\necho ${h}\n`,
                })));
                (p as any).baseDir = process.cwd();
                (p as any).makeExecutable = (pth: string) => Promise.resolve(p);
                await addGitHooksToProject(p as any as LocalProject);
                for (const h of ["post-commit", "post-merge"]) {
                    const s = path.join(".git", "hooks", h);
                    const f = await p.findFile(s);
                    const n = await f.getContent();
                    const e = `#!/bin/sh
echo ${h}

######## Atomist start ########

sha=\`git rev-parse HEAD\`
branch=\`git rev-parse --abbrev-ref HEAD\`
atomist git-hook ${h} "$PWD" "$branch" "$sha" &

######### Atomist end #########
`;
                    assert.strictEqual(n, e);
                }
                for (const h of ["post-receive"]) {
                    const s = path.join(".git", "hooks", h);
                    const f = await p.findFile(s);
                    const n = await f.getContent();
                    const e = `#!/bin/sh
echo ${h}

######## Atomist start ########

ATOMIST_GITHOOK_VERBOSE=true
export ATOMIST_GITHOOK_VERBOSE
read oldrev newrev refname
atomist git-hook post-receive "$PWD" "$refname" "$newrev" &

######### Atomist end #########
`;
                    assert.strictEqual(n, e);
                }
            });

        });

    });

    const hooks = ["post-commit", "post-merge", "post-receive"];

    describe("removeGitHooksFromProject", () => {

        it("should do nothing if hooks do not exist", async () => {
            const p = InMemoryProject.of();
            (p as any).baseDir = process.cwd();
            await removeGitHooksFromProject(p as any as LocalProject);
            hooks.forEach(h => {
                const s = path.join(".git", "hooks", h);
                assert(!p.fileExistsSync(s));
            });
        });

        it("should remove hooks from project", async () => {
            const p = InMemoryProject.of(...hooks.map(h => ({
                path: path.join(".git", "hooks", h),
                content: `#!/bin/sh\n# Atomist start #\natomist git-hook ${h}\n# Atomist end #\n`,
            })));
            (p as any).baseDir = process.cwd();
            await removeGitHooksFromProject(p as any as LocalProject);
            hooks.forEach(h => {
                const s = path.join(".git", "hooks", h);
                assert(!p.fileExistsSync(s));
            });
        });

        it("should retain non-Atomist chunks of hooks", async () => {
            const p = InMemoryProject.of(...hooks.map(h => ({
                path: path.join(".git", "hooks", h),
                content: `#!/bin/sh\necho ${h}\n\n# Atomist start #\natomist git-hook ${h}\n# Atomist end #\n`,
            })));
            (p as any).baseDir = process.cwd();
            await removeGitHooksFromProject(p as any as LocalProject);
            for (const h of hooks) {
                const s = path.join(".git", "hooks", h);
                const f = await p.findFile(s);
                const n = await f.getContent();
                const e = `#!/bin/sh\necho ${h}\n`;
                assert.strictEqual(n, e);
            }
        });

    });

    describe("git hooks round trip", () => {

        // tslint:disable:no-invalid-this
        before(function() {
            this.originalOsPlatform = Object.getOwnPropertyDescriptor(os, "platform");
            Object.defineProperty(os, "platform", {
                value: () => "freebsd",
            });
        });
        after(function() {
            Object.defineProperty(os, "platform", this.originalOsPlatform);
        });
        // tslint:enable:no-invalid-this

        it("should add and remove project hooks", async () => {
            const p = InMemoryProject.of();
            (p as any).baseDir = process.cwd();
            (p as any).makeExecutable = (pth: string) => Promise.resolve(p);
            await addGitHooksToProject(p as any as LocalProject);
            for (const h of ["post-commit", "post-merge"]) {
                const s = path.join(".git", "hooks", h);
                const f = await p.findFile(s);
                const n = await f.getContent();
                const e = `#!/bin/sh

######## Atomist start ########

sha=\`git rev-parse HEAD\`
branch=\`git rev-parse --abbrev-ref HEAD\`
atomist git-hook ${h} "$PWD" "$branch" "$sha" &

######### Atomist end #########
`;
                assert.strictEqual(n, e);
            }
            for (const h of ["post-receive"]) {
                const s = path.join(".git", "hooks", h);
                const f = await p.findFile(s);
                const n = await f.getContent();
                const e = `#!/bin/sh

######## Atomist start ########

ATOMIST_GITHOOK_VERBOSE=true
export ATOMIST_GITHOOK_VERBOSE
read oldrev newrev refname
atomist git-hook post-receive "$PWD" "$refname" "$newrev" &

######### Atomist end #########
`;
                assert.strictEqual(n, e);
            }
            await removeGitHooksFromProject(p as any as LocalProject);
            hooks.forEach(h => {
                const s = path.join(".git", "hooks", h);
                assert(!p.fileExistsSync(s));
            });
        });

        it("should add and remove content in project hooks", async () => {
            const p = InMemoryProject.of(...hooks.map(h => ({
                path: path.join(".git", "hooks", h),
                content: `#!/bin/sh\necho some non-Atomist-y ${h}\n`,
            })));
            (p as any).baseDir = process.cwd();
            (p as any).makeExecutable = (pth: string) => Promise.resolve(p);
            await addGitHooksToProject(p as any as LocalProject);
            for (const h of ["post-commit", "post-merge"]) {
                const s = path.join(".git", "hooks", h);
                const f = await p.findFile(s);
                const n = await f.getContent();
                const e = `#!/bin/sh
echo some non-Atomist-y ${h}

######## Atomist start ########

sha=\`git rev-parse HEAD\`
branch=\`git rev-parse --abbrev-ref HEAD\`
atomist git-hook ${h} "$PWD" "$branch" "$sha" &

######### Atomist end #########
`;
                assert.strictEqual(n, e);
            }
            for (const h of ["post-receive"]) {
                const s = path.join(".git", "hooks", h);
                const f = await p.findFile(s);
                const n = await f.getContent();
                const e = `#!/bin/sh
echo some non-Atomist-y ${h}

######## Atomist start ########

ATOMIST_GITHOOK_VERBOSE=true
export ATOMIST_GITHOOK_VERBOSE
read oldrev newrev refname
atomist git-hook post-receive "$PWD" "$refname" "$newrev" &

######### Atomist end #########
`;
                assert.strictEqual(n, e);
            }
            await removeGitHooksFromProject(p as any as LocalProject);
            for (const h of hooks) {
                const s = path.join(".git", "hooks", h);
                const f = await p.findFile(s);
                const n = await f.getContent();
                const e = `#!/bin/sh\necho some non-Atomist-y ${h}\n`;
                assert.strictEqual(n, e);
            }
        });

    });

});
