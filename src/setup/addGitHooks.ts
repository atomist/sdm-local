import { RemoteRepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { LocalProject } from "@atomist/automation-client/project/local/LocalProject";
import { NodeFsLocalProject } from "@atomist/automation-client/project/local/NodeFsLocalProject";
import { appendOrCreateFileContent } from "@atomist/sdm/api-helper/project/appendOrCreate";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { sprintf } from "sprintf-js";
import { HookEvents } from "./gitHooks";

const AtomistHookScriptName = "script/atomist-hook.sh";

/**
 * Add Git hooks to the given repo
 * @param {RemoteRepoRef} id
 * @param {string} projectBaseDir
 * @param gitHookScript absolute path to the script to run when a hook fires
 * @return {Promise<void>}
 */
export async function addGitHooks(id: RemoteRepoRef,
                                  projectBaseDir: string,
                                  gitHookScript: string) {
    if (fs.existsSync(`${projectBaseDir}/.git`)) {
        const p = await NodeFsLocalProject.fromExistingDirectory(id, projectBaseDir);
        return addGitHooksToProject(p, gitHookScript);
    } else {
        process.stdout.write(
            chalk.gray(sprintf("addGitHooks: Ignoring directory at %s as it is not a git project\n"),
                projectBaseDir));
    }
}

// TODO addGitHook to current project, and work it from where we are, going up if needed

export async function addGitHooksToProject(p: LocalProject, gitHookScript: string) {
    const atomistHookScriptPath = path.join(__dirname, "../../../", AtomistHookScriptName);
    const jsScriptPath = gitHookScript;

    for (const hookFile of HookEvents) {
        await appendOrCreateFileContent(
            {
                path: `/.git/hooks/${hookFile}`,
                toAppend: `\n${atomistHookScriptPath} ${jsScriptPath} ${hookFile} \${PWD}`,
                leaveAlone: oldContent => oldContent.includes(atomistHookScriptPath),
            })(p);
        await p.makeExecutable(`.git/hooks/${hookFile}`);
        process.stdout.write(chalk.gray(sprintf(
            `addGitHooks: Adding git ${hookFile} script to project at %s\n`,
            p.baseDir)));
    }
}

export async function removeGitHooks(id: RemoteRepoRef, baseDir: string) {
    if (fs.existsSync(`${baseDir}/.git`)) {
        const p = await NodeFsLocalProject.fromExistingDirectory(id, baseDir);
        for (const hookFile of HookEvents) {
            await deatomizeScript(p, `/.git/hooks/${hookFile}`);
        }
    } else {
        process.stdout.write(chalk.gray(sprintf(
            "removeGitHooks: Ignoring directory at %s as it is not a git project",
            baseDir)));
    }
}

/**
 * Remove Atomist hook from this script
 * @param {LocalProject} p
 * @param {string} path
 * @return {Promise<void>}
 */
async function deatomizeScript(p: LocalProject, scriptPath: string) {
    const script = await p.getFile(scriptPath);
    if (!script) {
        process.stdout.write(chalk.gray(sprintf(
            "removeGitHooks: No git hook %s in project at %s\n",
            scriptPath,
            p.baseDir)));
    } else {
        const content = await script.getContent();
        const lines = content.split("\n");
        const nonAtomist = lines
            .filter(line => !line.includes("atomist"))
            .filter(line => line.trim() !== "")
            .join("\n");
        if (nonAtomist.length > 0) {
            await script.setContent(nonAtomist);
            process.stdout.write(chalk.gray(sprintf(
                "removeGitHooks: Removing Atomist content from git hook %s in project at %s: Leaving \n%s",
                scriptPath,
                p.baseDir,
                nonAtomist)));
        } else {
            await p.deleteFile(scriptPath);
            process.stdout.write(chalk.gray(sprintf(
                "removeGitHooks: Removing git hook %s in project at %s\n",
                scriptPath,
                p.baseDir)));
        }
    }
}
