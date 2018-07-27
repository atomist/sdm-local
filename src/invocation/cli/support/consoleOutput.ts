import { logger } from "@atomist/automation-client";
import { sprintf } from "sprintf-js";

import chalk from "chalk";

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

export function infoMessage(msg: string, ...args: any[]) {
    process.stdout.write(chalk.cyan(sprintf(msg, ...args)));
}
