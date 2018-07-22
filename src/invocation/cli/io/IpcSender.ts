import { Sender } from "./ConsoleMessageClient";

const ipc = require("node-ipc");

ipc.config.id = "slalom-sender";
ipc.config.retry = 1500;
ipc.config.silent = true;

export const IpcSender: Sender = async msg => {
    ipc.connectTo("slalom", () => {
        // ipc.of.slalom.on("connect", () => {
        //     ipc.of["jest-observer"].emit("console-log", msg);
        // });
        ipc.of.slalom.on("connect", () => {
            ipc.of.slalom.emit("message", msg);
        });
    });
};