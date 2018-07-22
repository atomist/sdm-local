export class IpcServer {

    private readonly ipc = require("node-ipc");

    constructor(onMessage: (msg: string) => Promise<any>) {
        this.ipc.config.id = "slalom";
        this.ipc.config.retry = 1500;
        this.ipc.config.silent = true;
        this.ipc.serve(() => this.ipc.server.on("message", message => {
            return onMessage(message);
        }));
        this.ipc.server.start();
    }
}
