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

import { AutomationClientInfo } from "../../../AutomationClientInfo";
import { AutomationClientFinder } from "../AutomationClientFinder";

import * as _ from "lodash";
import { AutomationClientConnectionRequest } from "../AutomationClientConnectionConfig";
import { FixedAutomationClientFinder } from "./FixedAutomationClientFinder";
import { infoMessage } from "../../../..";

export interface PortRangeOptions {
    lowerPort: number;
    checkRange: number;
}

/**
 * Look across a range of ports
 */
export class PortRangeAutomationClientFinder implements AutomationClientFinder {

    private readonly options: PortRangeOptions;

    public async findAutomationClients(): Promise<AutomationClientInfo[]> {
        const requests: AutomationClientConnectionRequest[] = _.range(this.options.lowerPort, this.options.lowerPort + this.options.checkRange)
            .map(port => ({
                baseEndpoint: `http://localhost:${port}`,
            }));
        const found = await new FixedAutomationClientFinder(...requests).findAutomationClients();
        infoMessage("Connected to automation clients at %s\n", found.map(f => f.connectionConfig.baseEndpoint));
        return found;
    }

    constructor(opts: Partial<PortRangeOptions> = {}) {
        this.options = {
            lowerPort: 2866,
            checkRange: 10,
            ...opts,
        };
    }

}
