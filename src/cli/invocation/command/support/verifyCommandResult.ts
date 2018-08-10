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

import { exec, ExecOptions } from "child_process";
import { promisify } from "util";

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
