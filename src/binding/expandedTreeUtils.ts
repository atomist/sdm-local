import * as fs from "fs";

import * as _ from "lodash";

/**
 * Return the directory in our expanded structure for the given directory
 * @param {string} repositoryOwnerParentDirectory
 * @param {string} owner
 * @param {string} repo
 * @return {string}
 */
export function dirFor(repositoryOwnerParentDirectory: string, owner: string, repo: string) {
    return `${repositoryOwnerParentDirectory}/${owner}/${repo}`;
}

/**
 * Find the owner and repo from the given directory, returning the empty
 * object if it isn't within our expanded directory structure
 * @param {string} repositoryOwnerParentDirectory
 * @param {string} baseDir directory to test
 * @return {{owner?: string; repo?: string}}
 */
export function parseOwnerAndRepo(repositoryOwnerParentDirectory: string,
                                  baseDir: string = determineCwd()): { owner?: string, repo?: string } {
    if (!baseDir.startsWith(repositoryOwnerParentDirectory)) {
        return {};
    }
    const ourPart = baseDir.replace(repositoryOwnerParentDirectory, "");
    const pattern = /^\/([^\/]+)\/([^\/]+)$/;
    const match = ourPart.match(pattern);
    return !!match && match.length >= 2 ?
        { owner: match[1], repo: match[2] } :
        {};
}

/**
 * Is the given directory within the expanded directory tree?
 * @param repositoryOwnerParentDirectory
 * @param {string} baseDir directory to test
 * @return {boolean}
 */
export function withinExpandedTree(repositoryOwnerParentDirectory: string,
                                   baseDir: string = determineCwd()): boolean {
    const { owner, repo } = parseOwnerAndRepo(repositoryOwnerParentDirectory, baseDir);
    return !!owner && !!repo;
}

/**
 * Where are we running? Respecting symlinks
 * @return {string}
 */
export function determineCwd(): string {
    // Be sure to respect symlinks
    return process.env.PWD;
}

/**
 * What's the current SDM root, given a directory. That is, the base of the SDM project.
 * We can match the SDM root itself, or a project within it.
 * @return {string}
 */
export function determineSdmRoot(): string | undefined {
    let candidate = determineCwd();
    if (isSdmDir(candidate)) {
        // We're in an SDM directory
        return candidate;
    }

    if (!isCheckedOutDir(candidate)) {
        // Check out directories 2 down
        const grandkids: string[] = _.flatten(fs.readdirSync(candidate)
            .map(subdir => `${candidate}/${subdir}`)
            .filter(kid => fs.statSync(kid).isDirectory())
            .map(kid => ({ kid, grandkids: fs.readdirSync(kid).map(gk => `${kid}/${gk}`).filter(g => fs.statSync(g).isDirectory()) }))
            .map(path => path.grandkids),
        );
        const oneToUse = grandkids.find(isCheckedOutDir);
        if (!!oneToUse) {
            candidate = oneToUse;
        } else {
            return undefined;
        }
    }

    try {
        // Look for git hook
        const hookContent = fs.readFileSync(`${candidate}/.git/hooks/post-commit`).toString();
        if (!hookContent.includes("node_modules")) {
            return undefined;
        }
        // TODO this is fragile as it doesn't allow content before the Atomist path
        const sdmRoot = hookContent.slice(0, hookContent.indexOf("node_modules")).trim();
        return sdmRoot;
    } catch (err) {
        return undefined;
    }
}

function isCheckedOutDir(currentDir: string) {
    return fs.existsSync(`${currentDir}/.git/hooks/post-commit`);
}

function isSdmDir(currentDir: string) {
    return fs.existsSync(`${currentDir}/node_modules/@atomist/slalom/package.json`);
}
