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

import chalk from "chalk";
import { sprintf } from "sprintf-js";
import { AutomationClientInfo } from "../AutomationClientInfo";

/**
 * Format information about this automation for the console
 * @param {AutomationClientInfo} aci
 * @return {string}
 */
export function renderClientInfo(aci: AutomationClientInfo): string {
    const local = aci.localConfig ? aci.localConfig.repositoryOwnerParentDirectory : "(remote)";
    const reg = aci.location.baseEndpoint + "/registration";
    return `${chalk.bold(aci.client.name)} @ ${chalk.underline(aci.location.baseEndpoint)} - ${local} - ${reg}`;
}

export function renderEventDispatch(aci: AutomationClientInfo, what: any): string {
    return sprintf("Sending event %s to machine %s\n",
        chalk.yellow(JSON.stringify(what)),
        chalk.underline(aci.client.name));
}

export function renderClientsInfo(clients: AutomationClientInfo[]): string {
    let s = "";
    switch (clients.length) {
        case 0:
            s += sprintf("There are no connected SDMs\n", clients.length);
            break;
        case 1:
            s += sprintf("There is one connected SDM\n", clients.length);
            break;
        default:
            s += sprintf("There are %d connected SDMs\n", clients.length);
            break;
    }
    s += sprintf(`\t%s\n\n`, clients.map(renderClientInfo).join("\n\t"));
    return s;
}
