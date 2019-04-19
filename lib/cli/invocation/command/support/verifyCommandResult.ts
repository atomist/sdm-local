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

import {
    exec,
    ExecOptions,
} from "child_process";
import { promisify } from "util";

// TODO this file should move to sdm, allowing it to be used in extension packs etc.

export interface CommandResult {
    stdout: string;
    stderr?: string;
}

/**
 * Test part of a command verification request.
 * Allows reuse of command testing without defining
 * actions on success or failure, which are more likely to vary
 * in different contexts.
 */
export interface CommandTest {

    /**
     * Command, including arguments, to pass to exec
     */
    command: string;

    /**
     * Test for the output of a successful command
     * @param {string} stdout
     * @return {boolean}
     */
    outputTest?: (output: CommandResult) => boolean;

    /**
     * Options to pass to child_process.exec
     */
    execOptions?: ExecOptions;

}

export interface CommandVerificationRequest extends CommandTest {

    /**
     * Called when the command failed: For example,
     * because the command isn't installed
     * @param {Error} e
     */
    onFailure: (e: Error) => void;

    /**
     * Called when the command returns normally but we don't
     * like the returned result (test failed)
     */
    onWrongVersion: (r: CommandResult) => void;

    /**
     * Called when the command is successfully verified
     * @param {string} stdout
     */
    onVerified?: (stdout: string) => void;

}

/**
 * Verify the result of a command. Useful to test
 * whether a dependency of an SDM is installed
 * @param {CommandVerificationRequest} opts
 * @return {Promise<void>}
 */
export async function verifyCommandResult(opts: CommandVerificationRequest): Promise<void> {
    try {
        const r = await promisify(exec)(opts.command, opts.execOptions);
        if (!opts.outputTest || opts.outputTest(r)) {
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
