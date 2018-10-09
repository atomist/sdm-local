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

import {
    LocalProject,
    NodeFsLocalProject,
} from "@atomist/automation-client";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { HookEvent } from "../invocation/git/handleGitHookEvent";
import {
    errorMessage,
    infoMessage,
} from "../ui/consoleOutput";

/**
 * Add Git hooks to the given repo
 * @param {string} projectBaseDir
 * @return {Promise<void>}
 */
export async function addGitHooks(projectBaseDir: string) {
    if (fs.existsSync(path.join(projectBaseDir, ".git"))) {
        const p = await NodeFsLocalProject.fromExistingDirectory(undefined, projectBaseDir);
        return addGitHooksToProject(p);
    } else {
        infoMessage("Ignoring directory at %s as it is not a git project\n", projectBaseDir);
    }
}

export async function addGitHooksToProject(p: LocalProject) {
    for (const event of Object.values(HookEvent)) {
        const atomistContent = scriptFragments()[event as HookEvent];
        if (!atomistContent) {
            errorMessage("Unable to create git script content for event '%s'", event);
            process.exit(1);
        }
        await reatomizeScript(p, path.join(".git", "hooks", event), markAsAtomistContent(atomistContent));
        await p.makeExecutable(path.join(".git", "hooks", event));
    }
}

export async function removeGitHooks(baseDir: string) {
    if (fs.existsSync(path.join(baseDir, ".git"))) {
        const p = await NodeFsLocalProject.fromExistingDirectory({ owner: "doesn't", repo: "matter", url: undefined }, baseDir);
        await removeGitHooksFromProject(p);
    } else {
        infoMessage("Ignoring directory at %s as it is not a git project", baseDir);
    }
}

export async function removeGitHooksFromProject(p: LocalProject) {
    for (const hookFile of Object.values(HookEvent)) {
        await deatomizeScript(p, path.join(".git", "hooks", hookFile));
    }
}

const atomistContentRegExp = /\n#+\s+Atomist start\s+#+\n[\S\s]*?\n#+\s+Atomist end\s+#+\n/;

/**
 * Update the Atomist script element if found
 */
export async function reatomizeScript(p: LocalProject, scriptPath: string, newContent: string): Promise<LocalProject> {
    const scriptFile = await p.getFile(scriptPath);
    if (!scriptFile) {
        await p.addFile(scriptPath, `#!/bin/sh\n${newContent}`);
        infoMessage("Added git hook %s in project at %s\n", scriptPath, p.baseDir);
    } else {
        const content = await scriptFile.getContent();
        if (atomistContentRegExp.test(content)) {
            const updatedAtomist = content.replace(atomistContentRegExp, newContent);
            await scriptFile.setContent(updatedAtomist);
            infoMessage("Updated Atomist content in git hook %s in project at %s\n", scriptPath, p.baseDir);
        } else {
            await scriptFile.setContent(content + newContent);
            infoMessage("Added Atomist content to git hook %s in project at %s\n", scriptPath, p.baseDir);
        }
    }
    return p;
}

/**
 * Remove Atomist hook from this script
 * @param {LocalProject} p
 * @param {string} scriptPath
 * @return {Promise<void>}
 */
export async function deatomizeScript(p: LocalProject, scriptPath: string): Promise<LocalProject> {
    const script = await p.getFile(scriptPath);
    if (!script) {
        infoMessage("No git hook %s in project at %s\n", scriptPath, p.baseDir);
    } else {
        const content = await script.getContent();
        const nonAtomist = content.replace(atomistContentRegExp, "");
        if (nonAtomist === content) {
            infoMessage("No Atomist content found in git hook %s in project at %s, ignoring\n",
                scriptPath, p.baseDir);
        } else if (/^(?:#!\/bin\/sh)?\s*$/.test(nonAtomist)) {
            await p.deleteFile(scriptPath);
            infoMessage("Deleted empty git hook %s in project at %s\n", scriptPath, p.baseDir);
        } else {
            await script.setContent(nonAtomist);
            infoMessage("Removed Atomist content from git hook %s in project at %s\n", scriptPath, p.baseDir);
        }
    }
    return p;
}

/**
 * Indexed templates fragments for use in git hooks
 * @return object whose keys are HookEvents and whose values are the shell script snippet for the hook
 */
function scriptFragments(): { [key in HookEvent]: string } {
    const bg = (os.platform() === "win32") ? "" : " &";
    return {
        [HookEvent.PostReceive]: `
ATOMIST_GITHOOK_VERBOSE=true
export ATOMIST_GITHOOK_VERBOSE
atomist git-hook ${HookEvent.PostReceive}${bg}
`,
        [HookEvent.PostCommit]: `
atomist git-hook ${HookEvent.PostCommit}${bg}
`,
        [HookEvent.PostMerge]: `
atomist git-hook ${HookEvent.PostMerge}${bg}
`,
    };
}

const AtomistStartComment = "\n######## Atomist start ########\n";
const AtomistEndComment = "\n######### Atomist end #########\n";

/**
 * Make it clear this is Atomist content. Makes it easy to remove later.
 * @param {string} toAppend
 * @return {string}
 */
export function markAsAtomistContent(toAppend: string) {
    return `${AtomistStartComment}${toAppend}${AtomistEndComment}`;
}
