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
import { infoMessage } from "../../../..";
import { AutomationClientConnectionRequest } from "../AutomationClientConnectionConfig";
import { FixedAutomationClientFinder } from "./FixedAutomationClientFinder";

import chalk from "chalk";
import * as os from "os";
import { defaultHostUrlAliaser } from "../../../../common/util/http/defaultLocalHostUrlAliaser";
import { renderClientInfo } from "../../../ui/renderClientInfo";

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
        const requests: AutomationClientConnectionRequest[] =
            _.range(this.options.lowerPort, this.options.lowerPort + this.options.checkRange)
                .concat(this.options.additionalPorts || [])
                .map(port => ({
                    baseEndpoint: `http://${defaultHostUrlAliaser().alias()}:${port}`,
                }));
        const found = await new FixedAutomationClientFinder(...requests).findAutomationClients();
        if (found.length > 0) {
            infoMessage(`Connected to ${chalk.bold(found.length.toString())} automation clients \n\t%s\n\n`,
                found.map(renderClientInfo).join("\n\t"));
        }
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
