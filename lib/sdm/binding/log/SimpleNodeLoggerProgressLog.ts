/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ProgressLog } from "@atomist/sdm";
import * as fileUrl from "file-url";
import * as fs from "fs-extra";
import * as path from "path";
import * as snLogger from "simple-node-logger";

/**
 * Write log to a file using simple-node-logger in the repository
 * root of an SDM. Basically, we just
 * need any logging framework but Winston, as this is
 * separate from the SDM log itself.
 */
export class SimpleNodeLoggerProgressLog implements ProgressLog {

    public log: string = "";

    private readonly logger: any;

    constructor(public readonly name: string, public readonly goalName: string, public readonly sdmRoot: string) {
        if (!fs.existsSync(sdmRoot)) {
            fs.mkdirsSync(sdmRoot);
        }
        this.logger = snLogger.createRollingFileLogger({
            logDirectory: sdmRoot,
            fileNamePattern: `${this.name.replace(/^.*\//, "")}-goals-<DATE>.log`,
            dateFormat: "YYYYMMDD",
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
        this.logger.info(`(${this.goalName}): ${what}`);

    }

    get url() {
        const appender = this.logger.getAppenders()[0];
        return fileUrl(path.join(this.sdmRoot, appender.createFileName()));
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
