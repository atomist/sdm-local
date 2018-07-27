import { Argv } from "yargs";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { startHttpMessageListener } from "../io/httpMessageListener";
import { logExceptionsToConsole } from "../support/consoleOutput";

export const AllMessagesPort = 6660;

export function addStartListenerCommand(ai: AutomationClientInfo, yargs: Argv) {
    yargs.command({
        command: "listen",
        describe: "Start listener daemon to display messages",
        handler: () => {
            return logExceptionsToConsole(async () =>
                    startHttpMessageListener(ai.connectionConfig, AllMessagesPort),
                ai.connectionConfig.showErrorStacks);
        },
    });
}
