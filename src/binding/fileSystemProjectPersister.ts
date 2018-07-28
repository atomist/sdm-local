import { logger } from "@atomist/automation-client";
import { successOn } from "@atomist/automation-client/action/ActionResult";
import { RepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { ProjectPersister } from "@atomist/automation-client/operations/generate/generatorUtils";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { NodeFsLocalProject } from "@atomist/automation-client/project/local/NodeFsLocalProject";
import * as fs from "fs";
import { promisify } from "util";
import { LocalMachineConfig } from "..";
import { handlePushBasedEventOnRepo } from "../invocation/git/handlePushBasedEventOnRepo";
import { AutomationClientConnectionConfig } from "../invocation/http/AutomationClientConnectionConfig";
import { addGitHooksToProject } from "../setup/addGitHooks";
import { lastSha } from "../util/git";
import { runAndLog } from "../util/runAndLog";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";
import { LocalProject } from "@atomist/automation-client/project/local/LocalProject";
import { sendChannelLinkEvent, sendRepoCreationEvent, sendRepoOnboardingEvent } from "./repoOnboardingEvents";

/**
 * Persist the project to the given local directory given expanded directory
 * conventions. Perform a git init and other after actions, such as installing
 * our git hooks.
 * @return {ProjectPersister}
 */
export function fileSystemProjectPersister(cc: AutomationClientConnectionConfig, lc: LocalMachineConfig): ProjectPersister {
    return async (p, _, id, params) => {
        const baseDir = `${lc.repositoryOwnerParentDirectory}/${id.owner}/${id.repo}`;
        const frr = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory: lc.repositoryOwnerParentDirectory,
            baseDir,
        });
        // Override target repo to get file url
        // TODO this is a bit nasty
        Object.defineProperty((params as any).target, "repoRef", {
            get() {
                return frr;
            },
        });
        logger.info("Persisting to [%s]", baseDir);
        if (await promisify(fs.exists)(baseDir)) {
            throw new Error(`Cannot write new project to [${baseDir}] as this directory already exists`);
        }
        const createdProject = await NodeFsLocalProject.copy(p, baseDir);
        await runAndLog("git init", { cwd: baseDir });
        await runAndLog("git add .", { cwd: baseDir });
        await runAndLog(`git commit -a -m "Initial commit from Atomist"`, { cwd: baseDir });
        await addGitHooksToProject(createdProject);

        await emitEventsForNewProject(cc, lc, createdProject, id);
        return successOn(createdProject);
    };
}

/**
 * Send events that should apply to a new project
 * @param {AutomationClientConnectionConfig} cc
 * @param {} lc
 * @param {LocalProject} createdProject
 * @param {RepoRef} id
 * @return {Promise<void>}
 */
async function emitEventsForNewProject(cc: AutomationClientConnectionConfig,
                                       lc: LocalMachineConfig,
                                       createdProject: LocalProject,
                                       id: RepoRef) {
    await sendRepoCreationEvent(cc, id);

    const sha = await lastSha(createdProject as GitProject);
    const branch = "master";

    await handlePushBasedEventOnRepo(cc, lc, {
        baseDir: createdProject.baseDir,
        sha,
        branch,
    }, "OnFirstPushToRepo");

    // This is the first push
    await handlePushBasedEventOnRepo(cc, lc, {
        baseDir: createdProject.baseDir,
        sha,
        branch,
    }, "SetGoalsOnPush");

    await sendRepoOnboardingEvent(cc, id);
    await sendChannelLinkEvent(cc, id);
}
