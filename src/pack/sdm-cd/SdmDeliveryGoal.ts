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
import { ExecuteGoal, GenericGoal, predicatePushTest } from "@atomist/sdm";
import { poisonAndWait } from "@atomist/sdm/api-helper/misc/spawned";
import { ProjectLoader } from "@atomist/sdm/spi/project/ProjectLoader";
import { ChildProcess, spawn } from "child_process";
import { isFileSystemRemoteRepoRef } from "../../sdm/binding/project/FileSystemRemoteRepoRef";

export const SdmDeliveryGoal = new GenericGoal({ uniqueName: "sdmDelivery" },
    "Deliver SDM");

export interface SdmDeliveryOptions {

}

export const IsSdm = predicatePushTest("IsSDM",
    async p => !!(await p.getFile("src/atomist.config.ts")));

/**
 * Deliver this SDM
 * @param projectLoader use to load projects
 * @param opts options
 */
export function executeSdmDelivery(projectLoader: ProjectLoader,
                                   opts: Partial<SdmDeliveryOptions>): ExecuteGoal {
    const deliveryManager = new DeliveryManager();
    return async goalInvocation => {
        const { id } = goalInvocation;
        await goalInvocation.addressChannels("should deliver SDM");
        try {
            if (!isFileSystemRemoteRepoRef(id)) {
                // Should not have been called
                throw new Error("Not a local repo ref: " + JSON.stringify(id));
            }
            await deliveryManager.deliver(id.fileSystemLocation);
            return { code: 0 };
        } catch (err) {
            logger.error(err);
            return { code: 1, message: err.stack };
        }
    };
}

const successPatterns = [
    /Starting Atomist automation client/,
];

class DeliveryManager {

    private childProcess: ChildProcess;

    public async deliver(baseDir: string) {
        if (!!this.childProcess) {
            await poisonAndWait;
        }
        const spawnCommand = asSpawnCommand("@atomist start --install=false --local=true --compile=false");
        this.childProcess = await spawn(
            spawnCommand.command,
            spawnCommand.args,
            { cwd: baseDir });

        return new Promise((resolve, reject) => {
            let stdout = "";
            this.childProcess.stdout.addListener("data", what => {
                if (!!what) {
                    stdout += what;
                }
                if (successPatterns.some(successPattern => successPattern.test(stdout))) {
                    resolve();
                }
            });
            this.childProcess.addListener("exit", () => {
                reject(new Error("We should have found success message pattern by now!!"));
            });
            this.childProcess.addListener("error", reject);
        });
    }

}
