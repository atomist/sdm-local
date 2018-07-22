import { clientIdentifier } from "../../../machine/correlationId";
import { Sender } from "./ConsoleMessageClient";

const ipc = require("node-ipc");

ipc.config.id = "slalom-sender";

// Don't retry: Messages stick around

ipc.config.retry = 0;
ipc.config.maxRetries = 0;
ipc.config.silent = true;

/**
 * Runs within server sending message to client
 * @param {string} sendToName
 * @param {string} correlationId
 * @return {Sender}
 */
export function ipcSender(sendToName: string, correlationId: string): Sender {
    return async msg => {
        const id = clientIdentifier(correlationId);
        ipc.connectTo(id, () => {
            ipc.of[id].on("connect", () => {
                ipc.of[id].emit("message", msg);
            });
        });
    };
}
