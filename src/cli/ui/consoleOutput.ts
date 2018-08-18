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
import * as boxen from "boxen";
import chalk from "chalk";
import { sprintf } from "sprintf-js";
import { renderProjectDocChunk } from "./docChunk";

/**
 * Perform the given action, logging exceptions to the console
 * @param {() => Promise<any>} what
 * @param showStack whether or not to show the stack
 * @return {Promise<void>}
 */
export async function logExceptionsToConsole(what: () => Promise<any>,
                                             showStack: boolean) {
    try {
        await what();
        process.exit(0);
    } catch (err) {
        const msg = (showStack ? err.stack : `Error: ${err.message}`) + "\n";
        errorMessage(msg);
        logger.error(`Error: ${err.message} - ${err.stack}`);
        process.exit(1);
    }
}

export function errorMessage(msg: string, ...args: any[]) {
    process.stdout.write(chalk.red(sprintf("✘ " + msg, ...args)));
}

export function warningMessage(msg: string, ...args: any[]) {
    process.stdout.write(chalk.yellowBright(sprintf("⚠︎ " + msg, ...args)));
}

/**
 * Get the user's attention without implying there's a problem
 * @param {string} msg
 * @param args
 */
export function adviceMessage(msg: string, ...args: any[]) {
    process.stdout.write(chalk.cyan(sprintf("⚠︎ " + msg, ...args)));
}

export function infoMessage(msg: string, ...args: any[]) {
    process.stdout.write(chalk.cyan(sprintf(msg, ...args)));
}

/**
 * Dynamically build an advice block from one or more documentation chunks
 * @param {string} relativePaths
 */
export function adviceDoc(...relativePaths: string[]) {
    const docChunk = relativePaths.map(renderProjectDocChunk).join("\n\n");
    if (docChunk) {
        process.stdout.write("\n" + boxen(docChunk, { padding: 1 }) + "\n\n");
    } else {
        warningMessage("Internal error: Document at '%s' not found");
    }
}
