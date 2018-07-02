import { logger } from "@atomist/automation-client";
import { successOn } from "@atomist/automation-client/action/ActionResult";
import { ProjectPersister } from "@atomist/automation-client/operations/generate/generatorUtils";
import { NodeFsLocalProject } from "@atomist/automation-client/project/local/NodeFsLocalProject";
import { execSync } from "child_process";
import * as fs from "fs";
import { addGitHooksToProject } from "../setup/addGitHooks";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";

/**
 * Persist the project to the given local directory given expanded directory
 * conventions. Perform a git init
 * @param {string} repositoryOwnerParentDirectory
 * @return {ProjectPersister}
 */
export function fileSystemProjectPersister(repositoryOwnerParentDirectory: string,
                                           sdmBaseDir: string): ProjectPersister {
    return async (p, _, id, params) => {
        const baseDir = `${repositoryOwnerParentDirectory}/${id.owner}/${id.repo}`;
        const frr = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory, baseDir});
        // Override target repo to get file url
        // TODO this is a bit nasty
        Object.defineProperty((params as any).target, "repoRef", {get() { return frr; }});
        logger.info("Persisting to [%s]", baseDir);
        if (fs.existsSync(baseDir)) {
            throw new Error(`Cannot write new project to [${baseDir}] as this directory already exists`);
        }
        const createdProject = await NodeFsLocalProject.copy(p, baseDir);
        execSync("git init", { cwd: baseDir });
        execSync("git add .", { cwd: baseDir });
        execSync(`git commit -a -m "Initial commit from Atomist"`, { cwd: baseDir });
        await addGitHooksToProject(createdProject, sdmBaseDir);
        return successOn(createdProject);
    };
}
