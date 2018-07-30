import chalk from "chalk";
import { isListenerRunning } from "../../../../binding/message/httpMessageListener";
import { infoMessage } from "./consoleOutput";

/**
 * Display a message to the console suggesting starting the listener
 * @return {Promise<void>}
 */
export async function suggestStartingAllMessagesListener() {
    const running = await isListenerRunning();
    if (!running) {
        infoMessage(`################### To see a complete message stream from across all commands and events, ` +
            `please start the Slalom listener by typing\n\t${chalk.yellow("@atomist listen")}\n###################\n\n`);
    }
}
