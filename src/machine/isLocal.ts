/**
 * Should this client be running in local mode?
 */
import { logger } from "@atomist/automation-client";

export function isLocal(): boolean {
    const local = process.env.ATOMIST_MODE === "local";
        // process.argv[0] === "slalom" || process.argv[0] === "@atomist";
    logger.info("Local determination is %s: startup command was '%s'", local, process.argv.join(" "));
    return local;
}
