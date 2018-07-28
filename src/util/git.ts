import { logger } from "@atomist/automation-client";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { runAndLog } from "./runAndLog";

/**
 * Get the last git commit message
 * @param {GitProject} p
 * @return {Promise<string>}
 */
export async function lastCommitMessage(p: GitProject): Promise<string> {
    const r = await runAndLog("git log -1 --pretty=%B", { cwd: p.baseDir });
    return r.stdout.trim();
}

export async function commitMessageForSha(sha: string, p: GitProject): Promise<string> {
    const r = await runAndLog(`git log --format=%B -n 1 ${sha}`, { cwd: p.baseDir });
    return r.stdout.trim();
}

export async function timestampFromCommit(sha: string, p: GitProject): Promise<string> {
    const r = await runAndLog(`git log --format=%ct -n 1 ${sha}`, { cwd: p.baseDir });
    return r.stdout.trim();
}

/**
 * Retrieve a number of git placeholders in a single call, for a particular sha
 * Return an indexed property by the codes, such as H
 * See https://git-scm.com/docs/git-log
 * @param {GitProject} p
 * @return {Promise<string>}
 */
export async function retrieveLogDataForSha(sha: string,
                                            baseDir: string,
                                            ...placeholders: string[]): Promise<{ [name: string]: string }> {
    const r = await runAndLog(`git log --format="${placeholders.map(ph => `%${ph}`).join(" ")}" -n 1 ${sha}`,
        { cwd: baseDir });
    const trimmed = r.stdout.trim();
    // We have an array of strings
    const result: any = {};
    trimmed.split(" ").forEach((retrieved, i) => result[placeholders[i]] = retrieved);
    logger.info("Git result for %s is %j", placeholders, result);
    return result;
}

export async function lastSha(p: GitProject): Promise<string> {
    const r = await runAndLog("git log -1 --format=format:%H", { cwd: p.baseDir });
    return r.stdout.trim();
}

/**
 * Get the last shas for this project
 * @param {GitProject} p
 * @return {Promise<string[]>}
 */
export async function shaHistory(p: GitProject): Promise<string[]> {
    const r = await runAndLog("git log --format=format:%H", { cwd: p.baseDir });
    return r.stdout.trim().split("\n");
}
