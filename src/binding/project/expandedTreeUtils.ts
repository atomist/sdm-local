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

const OwnerAndRepoPattern = /^\/([^\/]+)\/([^\/]+)$/;

const OwnerOnlyPattern = /^\/([^\/]+)$/;

function trimTrailingSlash(dir: string): string {
    return dir.replace(/\/$/, "");
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
    const pathUnder = trimTrailingSlash(baseDir
        .replace(trimTrailingSlash(repositoryOwnerParentDirectory), ""));
    const ownerAndRepoMatch = pathUnder.match(OwnerAndRepoPattern);
    if (!!ownerAndRepoMatch && ownerAndRepoMatch.length >= 2) {
        return { owner: ownerAndRepoMatch[1], repo: ownerAndRepoMatch[2] };
    }
    const ownerMatch = pathUnder.match(OwnerOnlyPattern);
    if (!!ownerMatch) {
        return { owner: ownerMatch[1], repo: undefined };
    }
    return {};
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
