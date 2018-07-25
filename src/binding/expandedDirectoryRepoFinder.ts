import { logger } from "@atomist/automation-client";
import { RepoFinder } from "@atomist/automation-client/operations/common/repoFinder";
import * as fs from "fs";
import * as _ from "lodash";
import { promisify } from "util";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";

/**
 * Find all repos under the given expanded directory structure
 * @param {string} repositoryOwnerParentDirectory
 * @return {RepoFinder}
 */
export function expandedDirectoryRepoFinder(repositoryOwnerParentDirectory: string): RepoFinder {
    return async () => {
        const eligibleDirectories: string[] =
            _.flatten(await Promise.all((await promisify(fs.readdir)(repositoryOwnerParentDirectory))
                .filter(item => fs.statSync(`${repositoryOwnerParentDirectory}/${item}`).isDirectory())
                .map(async org => {
                    logger.info("Searching under child directory [%s] of %s", org, repositoryOwnerParentDirectory);
                    return (await promisify(fs.readdir)(`${repositoryOwnerParentDirectory}/${org}`))
                        .map(repo => `${repositoryOwnerParentDirectory}/${org}/${repo}`)
                        .filter(repo => fs.existsSync(`${repo}/.git`));
                })),
            );
        return eligibleDirectories.map(dir =>
            FileSystemRemoteRepoRef.fromDirectory({
                repositoryOwnerParentDirectory,
                baseDir: dir,
                // TODO interesting question: Should this be checked out directory, or master
                // branch: "master"
            }));
    };
}
