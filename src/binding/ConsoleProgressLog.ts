import { ProgressLog, ProgressLogFactory } from "@atomist/sdm";
import { infoMessage } from "../invocation/cli/support/consoleOutput";

class ConsoleProgressLog implements ProgressLog {

    public log = "";

    public url = undefined;

    constructor(public name: string) {}

    public async isAvailable() { return true; }

    public flush() {
        return Promise.resolve();
    }

    public async close(): Promise<any> {
        // do nothing
    }

    public write(what: string) {
        this.log += what;
        infoMessage(">> " + what);
    }

}

export const createConsoleProgressLog: ProgressLogFactory = async (context, sdmGoal) => new ConsoleProgressLog(sdmGoal.name);
