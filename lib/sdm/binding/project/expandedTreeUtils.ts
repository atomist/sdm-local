/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as os from "os";
import * as path from "path";

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

const sep = (path.sep === "\\") ? "\\\\" : path.sep;

const OwnerAndRepoPattern = new RegExp(["^", "([^", "]+)", "([^", "]+)$"].join(sep));

const OwnerOnlyPattern = new RegExp(["^", "([^", "]+)$"].join(sep));

function trimTrailingSlash(dir: string): string {
    return dir.replace(/[\/\\]$/, "");
}

/**
 * Transform native win32 path to a cygwin path.  All backslashes in
 * the path are replaced forward slashes and any leading drive letter
 * is incorprated into the path as a lowercased first directory of the
 * path.
 *
 * @param dir original path
 * @return cygwinized path
 */
export function cygwinizePath(dir: string): string {
    return dir.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (f, m) => `/${m.toLocaleLowerCase()}`);
}

/**
 * Determine whether baseDir is under repositoryOwnerparentdirectory.
 * On win32, the comparison is done in a case-insensitive way and also
 * tries to deal with Cygwin-style paths.
 *
 * @param repositoryOwnerParentDirectory parent directory
 * @param baseDir putative child directory
 * @return true if baseDir is under repositoryownerparentdirectory
 */
export function isWithin(repositoryOwnerParentDirectory: string, baseDir: string): boolean {
    if (os.platform() === "win32") {
        const owner = repositoryOwnerParentDirectory.toLocaleLowerCase();
        const repo = baseDir.toLocaleLowerCase();
        return repo.startsWith(owner) || cygwinizePath(repo).startsWith(cygwinizePath(owner));
    }
    return baseDir.startsWith(repositoryOwnerParentDirectory);
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
    if (!repositoryOwnerParentDirectory || !isWithin(repositoryOwnerParentDirectory, baseDir)) {
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
    return process.cwd();
}
