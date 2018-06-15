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
 * @param {string} projectBaseDir
 * @param sdmBaseDir base directory to install
 * @return {Promise<void>}
 */
export async function addGitHooks(id: RemoteRepoRef,
                                  projectBaseDir: string,
                                  sdmBaseDir: string) {
    if (fs.existsSync(`${projectBaseDir}/.git`)) {
        const p = await NodeFsLocalProject.fromExistingDirectory(id, projectBaseDir);
        return addGitHooksToProject(p, sdmBaseDir);
    } else {
        writeToConsole({
                message: "addGitHooks: Ignoring directory at %s as it is not a git project",
                color: "gray",
            },
            projectBaseDir);
    }
}

export async function addGitHooksToProject(p: LocalProject, sdmBaseDir: string) {
    const atomistHookScriptPath = `${sdmBaseDir}/node_modules/@atomist/slalom/${AtomistHookScriptName}`;
    const jsScriptPath = `${sdmBaseDir}/node_modules/@atomist/slalom/build/src/invocation/git/onGitHook.js`;

    await appendOrCreateFileContent(
        {
            toAppend: `\n${atomistHookScriptPath} ${jsScriptPath} postCommit \${PWD}`,
            path: "/.git/hooks/post-commit",
            leaveAlone: oldContent => oldContent.includes(atomistHookScriptPath),
        })(p);
    // TODO setting executable status should be on the project API
    fs.chmodSync(`${p.baseDir}/.git/hooks/post-commit`, 0o755);
    writeToConsole({
            message: "addGitHooks: Adding git post-commit script to project at %s",
            color: "gray",
        },
        p.baseDir);
}

export async function removeGitHooks(id: RemoteRepoRef, baseDir: string) {
    if (fs.existsSync(`${baseDir}/.git`)) {
        const p = await NodeFsLocalProject.fromExistingDirectory(id, baseDir);
        await deatomizeScript(p, "/.git/hooks/post-commit");
    } else {
        writeToConsole({
                message: "removeGitHooks: Ignoring directory at %s as it is not a git project",
                color: "gray",
            },
            baseDir);
    }
}

/**
 * Remove Atomist hook from this script
 * @param {LocalProject} p
 * @param {string} path
 * @return {Promise<void>}
 */
async function deatomizeScript(p: LocalProject, path: string) {
    const script = await p.getFile(path);
    if (!script) {
        writeToConsole({
                message: "removeGitHooks: No git hook %s in project at %s",
                color: "gray",
            },
            path,
            p.baseDir);
    } else {
        const content = await script.getContent();
        const lines = content.split("\n");
        const nonAtomist = lines
            .filter(line => !line.includes("atomist"))
            .filter(line => line.trim() !== "")
            .join("\n");
        if (nonAtomist.length > 0) {
            await script.setContent(nonAtomist);
            writeToConsole({
                    message: "removeGitHooks: Removing Atomist content from git hook %s in project at %s: Leaving \n%s",
                    color: "gray",
                },
                path,
                p.baseDir,
                nonAtomist);
        } else {
            await p.deleteFile(path);
            writeToConsole({
                    message: "removeGitHooks: Removing git hook %s in project at %s",
                    color: "gray",
                },
                path,
                p.baseDir);
        }
    }
}
