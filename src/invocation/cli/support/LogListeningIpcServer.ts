import { promisify } from "util";

/**
 * Runs within client, listening for messages
 */
export class LogListeningIpcServer {

    private readonly ipc = require("node-ipc");

    constructor(public readonly id: string,
                onMessage: (msg: string) => Promise<any>) {
        this.ipc.config.id = id;
        this.ipc.config.retry = 1500;
        this.ipc.config.silent = true;
        this.ipc.serve(() => this.ipc.server.on("message", message => {
            return onMessage(message);
        }));
        this.ipc.server.start();
        // infoMessage("Listening on '%s'", id);
    }

    public async stop() {
        // Allow for messages to be flushed. A bit nasty
        await sleepPlease(1000);
        // process.stdout.write("Closing IPC server");
        return this.ipc.server.stop();
    }
}

const sleepPlease: (timeout: number) => Promise<void> =
    promisify((a, b) => setTimeout(b, a));
