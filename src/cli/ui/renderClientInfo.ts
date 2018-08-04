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

import { AutomationClientInfo } from "../AutomationClientInfo";
import chalk from "chalk";
import { sprintf } from "sprintf-js";

/**
 * Format information about this automation for the console
 * @param {AutomationClientInfo} aci
 * @return {string}
 */
export function renderClientInfo(aci: AutomationClientInfo): string {
    const local = aci.localConfig ? aci.localConfig.repositoryOwnerParentDirectory : "(remote)";
    const reg = aci.connectionConfig.baseEndpoint + "/registration";
    return `${chalk.bold(aci.client.name)} @ ${chalk.underline(aci.connectionConfig.baseEndpoint)} - ${local} - ${reg}`;
}

export function renderEventDispatch(aci: AutomationClientInfo, what: any) {
    return sprintf("Sending event %s to machine %s\n",
        chalk.yellow(JSON.stringify(what)),
        chalk.underline(aci.client.name));
}