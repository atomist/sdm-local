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

import { LocalModeConfiguration } from "@atomist/sdm-core";
import axios from "axios";
import { AutomationClientInfo, ConnectedClient } from "../../AutomationClientInfo";
import { AutomationClientConnectionConfig, AutomationClientConnectionRequest } from "./AutomationClientConnectionConfig";

/**
 * Call into an automation client at the given location and retrieve metadata
 * @param {AutomationClientConnectionConfig} connectionConfig
 * @return {Promise<AutomationClientInfo>}
 */
export async function fetchMetadataFromAutomationClient(connectionConfig: AutomationClientConnectionRequest): Promise<AutomationClientInfo> {
    // infoMessage("Connecting to Automation client at %s (%d)\n", connectionConfig.baseEndpoint, process.pid);

    try {
        const resp = await axios.get(connectionConfig.baseEndpoint + "/registration", {
            timeout: 5 * 1000,
        });
        let localConfig: LocalModeConfiguration;
        try {
            localConfig = (await axios.get(connectionConfig.baseEndpoint + "/local/configuration")).data;
        } catch {
            // Do nothing. The automation client we're talking to is not in local mode
        }
        const client: ConnectedClient = resp.data;
        return {
            client,
            localConfig,
            connectionConfig: {
                ...connectionConfig,
                // TODO fix this; we need to read the client.config.json as fallback
                atomistTeamId: client.team_ids ? client.team_ids[0] : "local",
                // TODO fix this
                atomistTeamName: "local",
            },
        };
    } catch (e) {
        // errorMessage("Unable to connect to '%s': Is a Software Delivery Machine running?\n\t(%s)\n",
        //     connectionConfig.baseEndpoint, e);
        return {
            client: undefined,
            localConfig: undefined,
            connectionConfig: {
                ...connectionConfig,
                atomistTeamId: undefined,
                // TODO fix this
                atomistTeamName: undefined,
            },
        };
    }
}
