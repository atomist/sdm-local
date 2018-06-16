import { logger } from "@atomist/automation-client";
import { sprintf } from "sprintf-js";

// tslint:disable-next-line:no-var-requires
const chalk = require("chalk");

export function setCommandLineLogging() {
    // Relies on being Winston logging
    (logger as any).transports.console.silent = true;
}

export interface ConsoleWriteOptions {
    message: string;
    color: "cyan" | "red" | "redBright" | "blue" | "green" | "gray" | "yellow";
}

export function writeToConsole(msg: string | ConsoleWriteOptions, ...args: any[]) {
    let expanded: string;
    if (typeof msg === "string") {
        expanded = sprintf(msg, ...args);
    } else {
        const fun = chalk[msg.color];
        if (!fun) {
            throw new Error(`No chalk function '${fun}' in ${JSON.stringify(msg)}`);
        }
        expanded = fun(sprintf(msg.message, ...args));
    }
    process.stdout.write(expanded + "\n");
}

export async function logExceptionsToConsole(what: () => Promise<any>) {
    try {
        await what();
    } catch (err) {
        writeToConsole({ message: `Error: ${err.message} - \n${err.stack}`, color: "red" });
        logger.error(`Error: ${err.message} - ${err.stack}`);
        process.exit(1);
    }
}
