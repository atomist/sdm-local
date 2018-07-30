import { Argv } from "yargs";
import { LocalMachineConfig } from "../../..";
import { expandedTreeRepoFinder } from "../../../binding/project/expandedTreeRepoFinder";
import {
    determineCwd,
    parseOwnerAndRepo,
} from "../../../binding/project/expandedTreeUtils";
import {
    FileSystemRemoteRepoRef,
    isFileSystemRemoteRepoRef,
} from "../../../binding/project/FileSystemRemoteRepoRef";
import {
    addGitHooks,
    removeGitHooks,
} from "../../../setup/addGitHooks";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { infoMessage, logExceptionsToConsole } from "./support/consoleOutput";

/**
 * Command to add git hooks to current directory or all projects
 * @param ai config
 * @param {yargs.Argv} yargs
 */
export function addAddGitHooksCommand(ai: AutomationClientInfo, yargs: Argv) {
    yargs.command({
        command: "add-git-hooks",
        describe: `Install git hooks for projects under ${ai.localConfig.repositoryOwnerParentDirectory}`,
        handler: () => {
            return logExceptionsToConsole(() => installHookOrHooks(ai.localConfig), ai.connectionConfig.showErrorStacks);
        },
    });
}

export function addRemoveGitHooksCommand(ai: AutomationClientInfo, yargs: Argv) {
    yargs.command({
        command: "remove-git-hooks",
        describe: `Remove git hooks for projects managed by this SDM, or in current directory if not connected to an SDM`,
        handler: () => {
            return logExceptionsToConsole(() => {
                return removeHookOrHooks(!!ai ? ai.localConfig : undefined);
            }, ai.connectionConfig.showErrorStacks);
        },
    });
}

async function installHookOrHooks(lc: LocalMachineConfig) {
    const repositoryOwnerParentDirectory = lc.repositoryOwnerParentDirectory;
    const { owner, repo } = parseOwnerAndRepo(repositoryOwnerParentDirectory);
    if (!!owner && !!repo) {
        const rrr = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory,
            baseDir: determineCwd(),
        });
        return addGitHooks(rrr, rrr.fileSystemLocation);

    }
    return installAllGitHooks(lc);
}

async function removeHookOrHooks(lc?: LocalMachineConfig) {
    if (!lc) {
        const cwd = determineCwd();
        return removeGitHooks(cwd);
    }
    const repositoryOwnerParentDirectory = lc.repositoryOwnerParentDirectory;
    const { owner, repo } = parseOwnerAndRepo(repositoryOwnerParentDirectory);
    if (!!owner && !!repo) {
        const id = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory,
            baseDir: determineCwd(),
        });
        return removeGitHooks(id.fileSystemLocation);
    }
    return removeAllGitHooks(lc);
}

/**
 * * Install git hooks in all git projects under our expanded directory structure
 * @return {Promise<void>}
 */
async function installAllGitHooks(lc: LocalMachineConfig) {
    const repoFinder = expandedTreeRepoFinder(lc.repositoryOwnerParentDirectory);
    const allRepos = await repoFinder(undefined);
    for (const rr of allRepos) {
        if (!isFileSystemRemoteRepoRef(rr)) {
            throw new Error(`Unexpected return from repo ref resolver: ${JSON.stringify(rr)}`);
        }
        await addGitHooks(rr, rr.fileSystemLocation);
    }
}

async function removeAllGitHooks(lc: LocalMachineConfig) {
    const repoFinder = expandedTreeRepoFinder(lc.repositoryOwnerParentDirectory);
    const allRepos = await repoFinder(undefined);
    for (const rr of allRepos) {
        if (!isFileSystemRemoteRepoRef(rr)) {
            throw new Error(`Unexpected return from repo ref resolver: ${JSON.stringify(rr)}`);
        }
        await removeGitHooks(rr.fileSystemLocation);
    }
}
