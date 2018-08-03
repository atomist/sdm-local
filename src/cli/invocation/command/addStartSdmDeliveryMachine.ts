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
import { infoMessage, logExceptionsToConsole } from "./support/consoleOutput";
import { startEmbeddedMachine } from "../../embedded/embeddedMachine";
import { SdmCd } from "../../../pack/sdm-cd/SdmCd";

import chalk from "chalk";
import { fetchMetadataFromAutomationClient } from "../http/fetchMetadataFromAutomationClient";

export const DefaultSdmCdPort = 2901;

/**
 * Start an SDM dedicated to SDM CD
 * @param {yargs.Argv} yargs
 */
export function addStartSdmDeliveryMachine(yargs: Argv) {
    yargs.command({
        command: "deliver [port] [base]",
        describe: "Start SDM delivery machine",
        handler: argv =>  {
            return logExceptionsToConsole(async () => {
                const port = !!argv.port ? parseInt(argv.port) : DefaultSdmCdPort;
                const where = await startSdmMachine(port, argv.base);
                const client = await fetchMetadataFromAutomationClient(where);
                infoMessage("Started local SDM delivery machine %s at %s\n",
                    chalk.bold(client.client.name),
                    chalk.underline(where.baseEndpoint));
            }, true);
        },
    });
}

async function startSdmMachine(port: number, repositoryOwnerParentDirectory?: string) {
    return startEmbeddedMachine({
        repositoryOwnerParentDirectory,
        port,
        configure: sdm => {
            sdm.addExtensionPacks(SdmCd);
        },
    });
}
