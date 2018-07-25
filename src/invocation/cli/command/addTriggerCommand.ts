import { Argv } from "yargs";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { HookEvents } from "../../git/gitHooks";
import { triggerGitEvents } from "../../git/triggerGitEvents";
import { logExceptionsToConsole } from "../support/consoleOutput";

/**
 * Add a command to triggerGitEvents execution following a git event
 * @param {yargs.Argv} yargs
 */
export function addTriggerCommand(ai: AutomationClientInfo, yargs: Argv) {
    yargs.command({
        command: "trigger <event> [depth]",
        describe: "Trigger commit action on the current repository",
        builder: ra => {
            return ra.positional("event", {
                choices: HookEvents,
            }).positional("depth", {
                type: "number",
                default: 1,
            });
        },
        handler: ya => {
            return logExceptionsToConsole(() => triggerGitEvents(ai, ya.event, ya.depth), ai.connectionConfig.showErrorStacks);
        },
    });
}
