import { logger } from "@atomist/automation-client";
import { successOn } from "@atomist/automation-client/action/ActionResult";
import { ProjectPersister } from "@atomist/automation-client/operations/generate/generatorUtils";
import { NodeFsLocalProject } from "@atomist/automation-client/project/local/NodeFsLocalProject";
import * as fs from "fs";
import { promisify } from "util";
import { errorMessage } from "../invocation/cli/support/consoleOutput";
import { addGitHooksToProject } from "../setup/addGitHooks";
import { runAndLog } from "../util/runAndLog";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";
import { handleEventOnRepo } from "../invocation/git/handleEventOnRepo";
import { shaHistory } from "../util/git";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { LocalMachineConfig } from "..";
import { AutomationClientConnectionConfig } from "../invocation/http/AutomationClientConnectionConfig";

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

        await handleEventOnRepo(cc, lc, {
            baseDir,
            sha: shaHistory(createdProject as GitProject)[0],
            branch: "master",
        }, "OnFirstPushToRepo");

        return successOn(createdProject);
    };
}
