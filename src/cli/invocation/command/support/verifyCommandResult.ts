import { promisify } from "util";
import { exec, ExecOptions } from "child_process";

export interface CommandVerificationOptions {

    command: string;

    stdoutTest?: (stdout: string) => boolean;

    /**
     * Called whe the command failed: For example,
     * because the command isn't installed
     * @param {Error} e
     */
    onFailure: (e: Error) => void;

    /**
     * Called when the command returns normally but we don't
     * like the returned result
     * @param {{stdout: string; stderr: string}} r
     */
    onWrongVersion: (r: { stdout: string, stderr: string }) => void;
    onVerified?: (stdout: string) => void;
    execOptions?: ExecOptions;
}

/**
 * Verify the result of a command
 * @param {CommandVerificationOptions} opts
 * @return {Promise<void>}
 */
export async function verifyCommandResult(opts: CommandVerificationOptions) {
    try {
        const r = await promisify(exec)(opts.command, opts.execOptions);
        if (!opts.stdoutTest || opts.stdoutTest(r.stdout)) {
            if (!!opts.onVerified) {
                opts.onVerified(r.stdout);
            }
        } else {
            opts.onWrongVersion(r);
        }
    } catch (e) {
        opts.onFailure(e);
    }
}