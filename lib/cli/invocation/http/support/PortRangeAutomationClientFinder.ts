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
import * as _ from "lodash";
import { determineDefaultHostUrl } from "../../../../sdm/configuration/defaultLocalSoftwareDeliveryMachineConfiguration";
import { AutomationClientInfo } from "../../../AutomationClientInfo";
import { AutomationClientConnectionRequest } from "../AutomationClientConnectionRequest";
import { AutomationClientFinder } from "../AutomationClientFinder";
import { FixedAutomationClientFinder } from "./FixedAutomationClientFinder";

export interface PortRangeOptions {

    lowerPort: number;

    /**
     * Number of ports to check
     */
    checkRange: number;

    /**
     * Additional ports to try to connect to.
     * Used for well-known ports
     */
    additionalPorts?: number[];
}

/**
 * Look across a range of ports
 */
export class PortRangeAutomationClientFinder implements AutomationClientFinder {

    private readonly options: PortRangeOptions;

    public async findAutomationClients(): Promise<AutomationClientInfo[]> {
        const low = this.options.lowerPort;
        const high = this.options.lowerPort + this.options.checkRange;
        const additional = this.options.additionalPorts || [];
        const hostUrl = determineDefaultHostUrl();
        logger.info(`Looking for automation clients at ${hostUrl} on ports: ${low}-${high} and ${additional.join(",")}`);
        const requests: AutomationClientConnectionRequest[] =
            _.range(low, high).concat(additional)
                .map(port => ({
                    baseEndpoint: `http://${hostUrl}:${port}`,
                }));
        return new FixedAutomationClientFinder(...requests).findAutomationClients();
    }

    constructor(opts: Partial<PortRangeOptions> = {}) {
        this.options = {
            lowerPort: 2866,
            checkRange: 10,
            ...opts,
        };
    }

}
