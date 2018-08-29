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

import { logger } from "@atomist/sdm";
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
