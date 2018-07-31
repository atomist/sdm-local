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

import { ProjectLoader } from "@atomist/sdm/spi/project/ProjectLoader";
import { ExecuteGoal, GenericGoal, predicatePushTest } from "@atomist/sdm";
import { logger } from "@atomist/automation-client";
import { spawnAndWatch } from "@atomist/sdm/api-helper/misc/spawned";
import { asSpawnCommand } from "@atomist/automation-client/util/spawned";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";
import { isFileSystemRemoteRepoRef } from "../../sdm/binding/project/FileSystemRemoteRepoRef";

export const SdmDeliveryGoal = new GenericGoal({ uniqueName: "sdmDelivery" },
    "Deliver SDM");

export interface SdmDeliveryOptions {

}

export const IsSdm = predicatePushTest("IsSDM",
    async p => !!(p.getFile("src/atomist.config.ts")));

/**
 * Deliver this SDM
 * @param projectLoader use to load projects
 * @param opts options
 */
export function executeSdmDelivery(projectLoader: ProjectLoader,
                                   opts: Partial<SdmDeliveryOptions>): ExecuteGoal {
    return async goalInvocation => {
        const { credentials, id } = goalInvocation;
        await goalInvocation.addressChannels("should deliver SDM");
        try {
            if (!isFileSystemRemoteRepoRef(id)) {
                throw new Error("Not a local repo ref: " + JSON.stringify(id));
            }
            await deliver(id.fileSystemLocation);
            return { code: 0 };
        }
        catch (err) {
            logger.error(err);
            return { code: 1, message: err.stack };
        }
    };
}

async function deliver(baseDir: string) {
    return spawnAndWatch(asSpawnCommand("slalom start --install=false --local=true --compile=false"),
        { cwd: baseDir },
        new LoggingProgressLog("info"));
}