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

import { Argv } from "yargs";
import { sdmCd } from "../../../pack/sdm-cd/support/SdmCd";
import { startEmbeddedMachine } from "../../embedded/embeddedMachine";
import { infoMessage, logExceptionsToConsole } from "./support/consoleOutput";

import { determineDefaultRepositoryOwnerParentDirectory } from "../../../sdm/configuration/createSdmOptions";
import { renderClientInfo } from "../../ui/renderClientInfo";

export const DefaultSdmCdPort = 2901;

/**
 * Start an SDM dedicated to SDM CD
 * @param {yargs.Argv} yargs
 */
export function addStartSdmDeliveryMachine(yargs: Argv) {
    yargs.command({
        command: "deliver",
        describe: "Start SDM delivery machine",
        builder: args => {
            return args.option("port", {
                required: false,
                default: DefaultSdmCdPort,
                type: "number",
                description: `Port for the delivery SDM. Defaults to ${DefaultSdmCdPort}`,
            }).option("base", {
                required: false,
                default: undefined,
                alias: "repositoryOwnerParentDirectory",
                description: `Base directory for the delivery SDM: Defaults to ${determineDefaultRepositoryOwnerParentDirectory()}`,
            });
        },
        handler: argv => {
            return logExceptionsToConsole(async () => {
                const client = await startSdmMachine(argv.port, argv.base);
                infoMessage("Started local SDM delivery machine %s\n",
                    renderClientInfo(client));
            }, true);
        },
    });
}

async function startSdmMachine(port: number, repositoryOwnerParentDirectory?: string) {
    return startEmbeddedMachine({
        repositoryOwnerParentDirectory,
        port,
        configure: sdm => {
            sdm.addExtensionPacks(sdmCd({ port }));
        },
    });
}
