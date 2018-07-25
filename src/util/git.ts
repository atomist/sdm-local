import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { exec } from "child_process";
import { promisify } from "util";

/**
 * Get the last git commit message
 * @param {GitProject} p
 * @return {Promise<string>}
 */
export async function lastCommitMessage(p: GitProject): Promise<string> {
    const r = await promisify(exec)("git log -1 --pretty=%B", { cwd: p.baseDir});
    return r.stdout.trim();
}

/**
 * Get the last shas for this project
 * @param {GitProject} p
 * @return {Promise<string[]>}
 */
export async function shaHistory(p: GitProject): Promise<string[]> {
    const r = await promisify(exec)("git log --format=format:%H", { cwd: p.baseDir});
    return r.stdout.trim().split("\n");
}
