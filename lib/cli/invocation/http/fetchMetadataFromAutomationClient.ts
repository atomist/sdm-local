/*
 * Copyright © 2019 Atomist, Inc.
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

// tslint:disable-next-line:import-blacklist
import axios from "axios";
import {
    AutomationClientInfo,
    ConnectedClient,
} from "../../AutomationClientInfo";
import { AutomationClientConnectionRequest } from "./AutomationClientConnectionRequest";
import {LocalSoftwareDeliveryMachineOptions} from "@atomist/sdm-core/lib/internal/machine/LocalSoftwareDeliveryMachineOptions";

/**
 * Call into an automation client at the given location and retrieve metadata
 * @return {Promise<AutomationClientInfo>}
 */
export async function fetchMetadataFromAutomationClient(location: AutomationClientConnectionRequest): Promise<AutomationClientInfo> {
    try {
        const resp = await axios.get(location.baseEndpoint + "/registration", {
            timeout: 5 * 1000,
        });
        let localConfig: LocalSoftwareDeliveryMachineOptions;
        try {
            localConfig = (await axios.get(location.baseEndpoint + "/local/configuration")).data;
        } catch {
            // Do nothing. The automation client we're talking to is not in local mode
        }
        const client: ConnectedClient = resp.data;
        return {
            client,
            localConfig,
            location,
        };
    } catch (e) {
        // errorMessage("Unable to connect to '%s': Is a Software Delivery Machine running?\n\t(%s)\n",
        //     location.baseEndpoint, e);
        return {
            client: undefined,
            localConfig: undefined,
            location,
        };
    }
}
