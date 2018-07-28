import { Argv } from "yargs";
import { AutomationClientConnectionConfig } from "../../http/AutomationClientConnectionConfig";
import { startHttpMessageListener } from "../io/httpMessageListener";
import { logExceptionsToConsole } from "../support/consoleOutput";

export const AllMessagesPort = 6660;

export function addStartListenerCommand(connectionConfig: AutomationClientConnectionConfig, yargs: Argv) {
    yargs.command({
        command: "listen",
        describe: "Start listener daemon to display messages",
        handler: () => {
            return logExceptionsToConsole(async () =>
                    startHttpMessageListener(connectionConfig, AllMessagesPort),
                connectionConfig.showErrorStacks);
        },
    });
}
