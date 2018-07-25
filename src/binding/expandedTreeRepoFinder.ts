import { RepoFinder } from "@atomist/automation-client/operations/common/repoFinder";
import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";
import { promisify } from "util";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";

/**
 * Find all repos under the given expanded directory structure
 * @param {string} repositoryOwnerParentDirectory
 * @return {RepoFinder}
 */
export function expandedTreeRepoFinder(repositoryOwnerParentDirectory: string): RepoFinder {
    return async () => {
        const owners = await allDirectoriesUnder(repositoryOwnerParentDirectory);
        const projects = await flatmapAsync(owners, allDirectoriesUnder);
        const gitProjects = await filterAsync(projects, containsDirectory(".git"));
        const eligibleDirectories = gitProjects;

        return eligibleDirectories.map(dir =>
            FileSystemRemoteRepoRef.fromDirectory({
                repositoryOwnerParentDirectory,
                baseDir: dir,
                // TODO interesting question: Should this be checked out directory, or master
                // branch: "master"
            }));
    };
}

const readdir = promisify(fs.readdir);
const filestat = promisify(fs.stat);

/* returns the whole path to each directory under `parent` */
async function allDirectoriesUnder(parent: string): Promise<string[]> {
    const allFilenamesUnder: string[] = await readdir(parent);
    const allPathsUnder = allFilenamesUnder.map(filename => path.join(parent, filename));
    return filterAsync(allPathsUnder, pathIsDirectory);
}

async function pathIsDirectory(filepath: string): Promise<boolean> {
    // will throw if filepath does not exist
    return filestat(filepath).then(stat => stat.isDirectory());
}

async function flatmapAsync<T, U>(arr: T[], f: (t: T) => Promise<U[]>): Promise<U[]> {
    return _.flatten(await Promise.all(arr.map(f)));
}

async function filterAsync<T>(arr: T[], f: (t: T) => Promise<boolean>): Promise<T[]> {
    type WithTruthiness<TT> = [TT, boolean];

    const enoughInfo: Array<WithTruthiness<T>> = await Promise.all(
        arr.map(t => f(t)
            .then((truthiness: boolean): WithTruthiness<T> => [t, truthiness])));

    return enoughInfo.filter(wt => wt[1]).map(wt => wt[0]);
}

function containsDirectory(dirName: string): (parent: string) => Promise<boolean> {
    return async (parentDir: string) => {
        return (await filestat(path.join(parentDir, dirName))
            .catch(() => NotADirectory)).isDirectory();
    };
}

const NotADirectory = {
    isDirectory() {
        return false;
    },
};
