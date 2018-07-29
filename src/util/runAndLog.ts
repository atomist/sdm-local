import { logger } from "@atomist/automation-client";
import {
    exec,
    ExecOptions,
} from "child_process";
import { promisify } from "util";

/**
 * Shell out to the given command showing stdout and stderr
 * @param {string} cmd
 * @param {module:child_process.ExecOptions} opts
 * @return {Promise<{stdout: string; stderr: string}>}
 */
export async function runAndLog(cmd: string, opts: ExecOptions): Promise<{stdout: string, stderr: string}> {
    const result = await promisify(exec)(cmd, opts);
    logger.info("[%s] %s stdout was \n%s", opts.cwd, cmd, result.stdout);
    if (!!result.stderr) {
        logger.warn("[%s] %s stderr was \n%s", opts.cwd, cmd, result.stderr);
    }
    return result;
}
