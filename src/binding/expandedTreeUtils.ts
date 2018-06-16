import * as fs from "fs";

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
 * What's the current SDM root?
 * @return {string}
 */
export function determineSdmRoot(): string | undefined {
    const currentDir = determineCwd();
    if (fs.existsSync(`${currentDir}/node_modules/@atomist/slalom/package.json`)) {
        // We're in an SDM directory
        return determineCwd();
    }
    try {
        // Look for git hook
        const hookContent = fs.readFileSync(`${currentDir}/.git/hooks/post-commit`).toString();

        // TODO this is fragile as it doesn't allow content before the Atomist path
        const sdmRoot = hookContent.slice(0, hookContent.indexOf("node_modules")).trim();
        return sdmRoot;
    } catch (err) {
        return undefined;
    }
}
