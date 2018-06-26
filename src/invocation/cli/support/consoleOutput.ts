import { logger } from "@atomist/automation-client";
import { sprintf } from "sprintf-js";

// tslint:disable-next-line:no-var-requires
const chalk = require("chalk");

export function setCommandLineLogging() {
    // Relies on being Winston logging
    (logger as any).transports.console.silent = true;
}

export async function logExceptionsToConsole(what: () => Promise<any>) {
    try {
        await what();
    } catch (err) {
        errorMessage(`Error: ${err.message} - \n${err.stack}\n`);
        logger.error(`Error: ${err.message} - ${err.stack}`);
        process.exit(1);
    }
}

export function errorMessage(msg: string, ...args: any[]) {
    process.stdout.write(chalk.red(sprintf(msg, args)));
}

export function warning(msg: string, ...args: any[]) {
    process.stdout.write(chalk.yellow(sprintf(msg, args)));
}

export function infoMessage(msg: string, ...args: any[]) {
    process.stdout.write(chalk.cyan(sprintf(msg, args)));
}
