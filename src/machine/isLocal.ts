
import { logger } from "@atomist/automation-client";

/**
 * Should this client be running in local mode?
 */
export function isLocal(): boolean {
    const local = process.env.ATOMIST_MODE === "local";
        // process.argv[0] === "slalom" || process.argv[0] === "@atomist";
    logger.info("Local determination is %s: startup command was '%s'", local, process.argv.join(" "));
    return local;
}