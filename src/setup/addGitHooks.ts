import { RemoteRepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { LocalProject } from "@atomist/automation-client/project/local/LocalProject";
import { NodeFsLocalProject } from "@atomist/automation-client/project/local/NodeFsLocalProject";
import { appendOrCreateFileContent } from "@atomist/sdm/util/project/appendOrCreate";
import * as fs from "fs";
import { writeToConsole } from "../invocation/cli/support/consoleOutput";

const AtomistHookScriptName = "script/atomist-hook.sh";

/**
 * Add Git hooks to the given repo
 * @param {RemoteRepoRef} id
 * @param {string} baseDir
 * @return {Promise<void>}
 */
export async function addGitHooks(id: RemoteRepoRef, baseDir: string) {
    if (fs.existsSync(`${baseDir}/.git`)) {
        const p = await NodeFsLocalProject.fromExistingDirectory(id, baseDir);
        return addGitHooksToProject(p);
    } else {
        writeToConsole({
                message: "addGitHooks: Ignoring directory at %s as it is not a git project",
                color: "gray",
            },
            baseDir);
    }
}

export async function addGitHooksToProject(p: LocalProject) {
    // TODO setting executable status should be on the project API
    const baseDir = process.cwd();
    const atomistHookScriptPath = `${baseDir}/${AtomistHookScriptName}`;
    const jsScriptPath = `${baseDir}/build/src/invocation/git/onGitHook.js`;

    await appendOrCreateFileContent(
        {
            toAppend: `\n${atomistHookScriptPath} ${jsScriptPath} postCommit \${PWD}`,
            path: "/.git/hooks/post-commit",
            leaveAlone: oldContent => oldContent.includes(atomistHookScriptPath),
        })(p);
    fs.chmodSync(`${p.baseDir}/.git/hooks/post-commit`, 0o755);
    writeToConsole({
            message: "addGitHooks: Adding git post-commit script to project at %s",
            color: "gray",
        },
        p.baseDir);
}
