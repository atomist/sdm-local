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

import { automationClientInstance } from "@atomist/automation-client";
import * as _ from "lodash";
import { AutomationClientConnectionRequest } from "../../cli/invocation/http/AutomationClientConnectionRequest";
import { defaultHostUrlAliaser } from "../../common/util/http/defaultLocalHostUrlAliaser";

/**
 * Identify the address of the automation client we're running within
 */
export function currentMachineAddress(): AutomationClientConnectionRequest {
    const aci = automationClientInstance();
    if (!aci) {
        throw new Error("Internal error: No automation client appears to be running when trying to identify port to dispatch back to");
    }
    const port = _.get(aci, "configuration.http.port", 2866);
    return {
        baseEndpoint: `http://${defaultHostUrlAliaser().alias()}:${port}`,
    };
}
