import { Sender } from "./ConsoleMessageClient";

const ipc = require("node-ipc");

ipc.config.id = "slalom-sender";
ipc.config.retry = 0;
ipc.config.maxRetries = 0;
ipc.config.silent = true;

export const IpcSender: Sender = async msg => {
    process.stdout.write("SENDING IPC MESSAGE " + msg);
    ipc.connectTo("slalom", () => {
        ipc.of.slalom.on("connect", () => {
            ipc.of.slalom.emit("message", msg);
        });
    });
};
