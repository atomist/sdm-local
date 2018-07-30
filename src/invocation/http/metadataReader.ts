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

import axios from "axios";
import { LocalMachineConfig } from "../..";
import { AutomationClientInfo } from "../AutomationClientInfo";
import {
    errorMessage,
    infoMessage,
} from "../cli/command/support/consoleOutput";
import { AutomationClientConnectionConfig } from "./AutomationClientConnectionConfig";

/**
 * Call into an automation client at the given location and retrieve metadata
 * @param {AutomationClientConnectionConfig} connectionConfig
 * @return {Promise<AutomationClientInfo>}
 */
export async function fetchMetadataFromAutomationClient(connectionConfig: AutomationClientConnectionConfig): Promise<AutomationClientInfo> {
    infoMessage("Connecting to Automation client at %s (%d)\n", connectionConfig.baseEndpoint, process.pid);

    try {
        const resp = await axios.get(connectionConfig.baseEndpoint + "/registration", {
            timeout: 5 * 1000,
        });
        const commandsMetadata = resp.data.commands;
        let localConfig: LocalMachineConfig;
        try {
            localConfig = (await axios.get(connectionConfig.baseEndpoint + "/localConfiguration")).data;
        } catch {
            // Do nothing. The automation client we're talking to is not in local mode
        }
        return {
            commandsMetadata,
            localConfig,
            connectionConfig,
        };
    } catch (e) {
        errorMessage("Unable to connect to '%s': Is the automation client running?\n\t(%s)\n",
            connectionConfig.baseEndpoint, e);
        infoMessage("Fewer commands will be available\n");
        return {
            commandsMetadata: undefined,
            localConfig: undefined,
            connectionConfig,
        };
    }
}
