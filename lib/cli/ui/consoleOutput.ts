/*
 * Copyright © 2019 Atomist, Inc.
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

import * as boxen from "boxen";
import chalk from "chalk";
import { sprintf } from "sprintf-js";
import { renderProjectDocChunk } from "./docChunk";
import { logger } from "@atomist/sdm/lib/client";

/**
 * Perform the given action, logging exceptions to the console
 * @param {() => Promise<any>} what
 * @param showStack whether or not to show the stack
 * @return {Promise<void>}
 */
export async function logExceptionsToConsole(what: () => Promise<any>,
                                             showStack: boolean): Promise<void> {
    try {
        await what();
        // TODO this prevented waiting, but causes feed command to die immediately
        // process.exit(0);
    } catch (err) {
        const msg = (showStack ? err.stack : `Error: ${err.message}`) + "\n";
        errorMessage(msg);
        logger.error(`Error: ${err.message} - ${err.stack}`);
        process.exit(1);
    }
}

/**
 * Display an error message to the console, supporting sprintf style
 * @param msg message
 * @param args arguments
 */
export function errorMessage(msg: string, ...args: any[]): void {
    process.stdout.write(chalk.red(sprintf("✘ " + msg, ...args)));
}

/**
 * Display a warning message to the console, supporting sprintf style
 * @param msg message
 * @param args arguments
 */
export function warningMessage(msg: string, ...args: any[]): void {
    process.stdout.write(chalk.yellowBright(sprintf("⚠︎ " + msg, ...args)));
}

/**
 * Get the user's attention without implying there's a problem,
 * supporting sprintf style
 * @param {string} msg
 * @param args
 */
export function adviceMessage(msg: string, ...args: any[]): void {
    process.stdout.write(chalk.cyan(sprintf("⚠︎ " + msg, ...args)));
}

/**
 * Display an info message to the console, supporting sprintf style
 * @param msg message
 * @param args arguments
 */
export function infoMessage(msg: string, ...args: any[]): void {
    process.stdout.write(chalk.cyan(sprintf(msg, ...args)));
}

/**
 * Dynamically build an advice block from one or more documentation chunks
 * @param {string} relativePaths paths relative to the base of the current project
 */
export function adviceDoc(...relativePaths: string[]): void {
    const docChunk = relativePaths.map(renderProjectDocChunk).join("\n\n");
    if (docChunk) {
        // Some times you want to draw boxes manually (eg emoji use)
        // box characters is at pos 4; before is the terminal markdown
        if (docChunk.charAt(4) === "┌") {
            process.stdout.write("\n" + docChunk + "\n\n");
        } else {
            process.stdout.write("\n" + boxen(docChunk, { padding: 1 }) + "\n\n");
        }
    } else if (docChunk === "") {
        // this is fine, it's empty
    } else {
        warningMessage("Warning: unable to display advice: Document(s) at '%s' not found", relativePaths.join(":"));
    }
}
