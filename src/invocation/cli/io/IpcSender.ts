import { Sender } from "./ConsoleMessageClient";

const ipc = require("node-ipc");

ipc.config.id = "slalom-sender";

// Don't retry: Messages stick around

ipc.config.retry = 0;
ipc.config.maxRetries = 0;
ipc.config.silent = true;

export function ipcSender(sendToName: string): Sender {
    return async msg => {
        process.stdout.write("SENDING IPC MESSAGE " + msg);
        ipc.connectTo(sendToName, () => {
            ipc.of.slalom.on("connect", () => {
                ipc.of.slalom.emit("message", msg);
            });
        });
    };
}

