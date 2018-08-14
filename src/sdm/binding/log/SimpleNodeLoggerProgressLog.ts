import { ProgressLog } from "@atomist/sdm";

// tslint:disable-next-line:no-var-requires
const snLogger = require("simple-node-logger");

const LogFile = "atomist.log";

/**
 * Write log to a file using simple-node-logger in the repository
 * root of an SDM. Basically, we just
 * need any logging framework but Winston, as this is
 * separate from the SDM log itself.
 */
export class SimpleNodeLoggerProgressLog implements ProgressLog {

    public log: string = "";

    private readonly logger: any;

    constructor(public readonly name: string, public readonly sdmRoot: string) {
        this.logger = snLogger.createRollingFileLogger({
            logDirectory: sdmRoot,
            fileNamePattern: `${LogFile}-<DATE>.log`,
        });
    }

    public write(pWhat: string) {
        let what = pWhat || "";
        this.log += what;
        if (what.endsWith("\n\r") || what.endsWith("\r\n")) {
            what = what.slice(0, -2);
        }
        if (what.endsWith("\n")) {
            what = what.slice(0, -1);
        }
        this.logger.info(`(${this.name}): ${what}`);

    }

    public async isAvailable() {
        return true;
    }

    public flush() {
        return Promise.resolve();
    }

    public close() {
        return Promise.resolve();
    }

}
