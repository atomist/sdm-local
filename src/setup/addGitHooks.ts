process.env.ATOMIST_DISABLE_LOGGING = "true";

import { RemoteRepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { LocalProject } from "@atomist/automation-client/project/local/LocalProject";
import { NodeFsLocalProject } from "@atomist/automation-client/project/local/NodeFsLocalProject";
import { appendOrCreateFileContent } from "@atomist/sdm/api-helper/project/appendOrCreate";
import chalk from "chalk";
import * as fs from "fs";
import { sprintf } from "sprintf-js";

const AtomistHookScriptName = "script/atomist-hook.sh";

const HookFiles = [ "post-commit" ];

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
        process.stdout.write(
            chalk.gray(sprintf("addGitHooks: Ignoring directory at %s as it is not a git project\n"),
                projectBaseDir));
    }
}

export async function addGitHooksToProject(p: LocalProject, sdmBaseDir: string) {
    const atomistHookScriptPath = `${sdmBaseDir}/node_modules/@atomist/slalom/${AtomistHookScriptName}`;
    const jsScriptPath = `${sdmBaseDir}/node_modules/@atomist/slalom/build/src/invocation/git/onGitHook.js`;

    for (const hookFile of HookFiles) {
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
        for (const hookFile of HookFiles) {
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
async function deatomizeScript(p: LocalProject, path: string) {
    const script = await p.getFile(path);
    if (!script) {
        process.stdout.write(chalk.gray(sprintf(
            "removeGitHooks: No git hook %s in project at %s\n",
            path,
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
                path,
                p.baseDir,
                nonAtomist)));
        } else {
            await p.deleteFile(path);
            process.stdout.write(chalk.gray(sprintf(
                "removeGitHooks: Removing git hook %s in project at %s\n",
                path,
                p.baseDir)));
        }
    }
}
