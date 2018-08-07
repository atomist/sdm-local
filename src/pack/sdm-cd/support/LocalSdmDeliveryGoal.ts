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

import { logger } from "@atomist/automation-client";
import { asSpawnCommand } from "@atomist/automation-client/util/spawned";
import { ExecuteGoal, GenericGoal, GoalInvocation } from "@atomist/sdm";
import { DelimitedWriteProgressLogDecorator } from "@atomist/sdm/api-helper/log/DelimitedWriteProgressLogDecorator";
import { ChildProcess, spawn } from "child_process";
import { AutomationClientInfo } from "../../../cli/AutomationClientInfo";
import { fetchMetadataFromAutomationClient } from "../../../cli/invocation/http/fetchMetadataFromAutomationClient";
import { renderClientInfo } from "../../../cli/ui/renderClientInfo";
import { defaultHostUrlAliaser } from "../../../common/util/http/defaultLocalHostUrlAliaser";
import { isFileSystemRemoteRepoRef } from "../../../sdm/binding/project/FileSystemRemoteRepoRef";
import { runAndLog } from "../../../sdm/util/runAndLog";
import { SdmDeliveryOptions } from "./SdmDeliveryOptions";

export const LocalSdmDeliveryGoal = new GenericGoal(
    { uniqueName: "sdmDelivery" },
    "Deliver SDM");

/**
 * Deliver this SDM
 */
export function executeLocalSdmDelivery(options: SdmDeliveryOptions): ExecuteGoal {
    const deliveryManager = new DeliveryManager();

    return async goalInvocation => {
        const { id } = goalInvocation;
        if (!isFileSystemRemoteRepoRef(id)) {
            // Should not have been called
            throw new Error("Not a local repo ref: " + JSON.stringify(id));
        }

        try {
            await goalInvocation.addressChannels(`Beginning SDM delivery for SDM at ${id.fileSystemLocation}`);
            const client = await deliveryManager.deliver(id.fileSystemLocation, options, goalInvocation);
            if (!!client.client) {
                await goalInvocation.addressChannels(`SDM updated: ${renderClientInfo(client)}: pid=${client.pid}`);
            }
            return { code: 0 };
        } catch (err) {
            logger.error(err);
            return { code: 1, message: err.stack };
        }
    };
}

// Patterns that show success
const successPatterns = [
    /Starting Atomist automation client/,
];

/**
 * Hold state to manage one SDM
 */
class DeliveryManager {

    private readonly childProcesses: { [baseDir: string]: ChildProcess } = {};

    public async deliver(baseDir: string,
                         options: SdmDeliveryOptions,
                         goalInvocation: GoalInvocation): Promise<AutomationClientInfo & { pid: number }> {
        const baseEndpoint = `http://${defaultHostUrlAliaser().alias()}:${options.port}`;
        let childProcess = this.childProcesses[baseDir];

        if (!!childProcess) {
            // We started a process for this
            await killPrevious(baseDir);
            await goalInvocation.addressChannels(`Terminating process with pid \`${childProcess.pid}\` for SDM at ${baseDir}`);
        } else {
            // We didn't start it. If it's connected, leave it be
            const existing = await fetchMetadataFromAutomationClient({ baseEndpoint });
            if (!!existing.client) {
                // It's running but we didn't start it
                await goalInvocation.addressChannels(`Externally managed SDM already running at ${baseDir}: Doing nothing`);
                return {
                    ...existing,
                    pid: undefined,
                };
            }
            await goalInvocation.addressChannels(`No previous process found for SDM at ${baseDir}`);
        }

        const spawnCommand = asSpawnCommand("atomist start --install=false --local=true --compile=false");
        childProcess = spawn(
            spawnCommand.command,
            spawnCommand.args,
            { cwd: baseDir });

        this.childProcesses[baseDir] = childProcess;

        // Record output from child process
        const newLineDelimitedLog = new DelimitedWriteProgressLogDecorator(goalInvocation.progressLog, "\n");
        childProcess.stdout.on("data", what => newLineDelimitedLog.write(what.toString()));
        childProcess.stderr.on("data", what => newLineDelimitedLog.write(what.toString()));

        return new Promise<AutomationClientInfo & { pid: number }>((resolve, reject) => {
            let stdout = "";
            childProcess.stdout.addListener("data", async what => {
                if (!!what) {
                    stdout += what;
                }
                if (successPatterns.some(successPattern => successPattern.test(stdout))) {
                    const ccr = {
                        baseEndpoint
                    };
                    await fetchMetadataFromAutomationClient(ccr)
                        .then(aca => resolve({
                            pid: childProcess.pid,
                            ...aca,
                        }))
                        .catch(reject);
                }
            });
            childProcess.addListener("exit", () => {
                this.childProcesses[baseDir] = undefined;
                reject(new Error("Error starting managed SDM. We should have found success message pattern by now! Please check logs"));
            });
            childProcess.addListener("error", err => {
                this.childProcesses[baseDir] = undefined;
                return reject(err);
            });
        });
    }

}

// This is rather heavy-handed: Kills all processes that have started in this directory
async function killPrevious(baseDir: string) {
    const key = `${baseDir}/node_modules/@atomist/automation-client/start.client.js`;
    const cmd = `for pid in $(ps -ef | grep "${key}" | awk '{print $2}'); do kill -9 $pid; done`;
    let result;
    try {
        result = await runAndLog(cmd, {});
    } catch (err) {
        logger.warn("%j", result);
    }
}
