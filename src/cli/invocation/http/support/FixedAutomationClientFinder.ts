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
import { AutomationClientConnectionRequest } from "../AutomationClientConnectionConfig";
import { AutomationClientFinder } from "../AutomationClientFinder";
import { fetchMetadataFromAutomationClient } from "../fetchMetadataFromAutomationClient";

/**
 * Return connections matching to one or more requests.
 */
export class FixedAutomationClientFinder implements AutomationClientFinder {

    private readonly requests: AutomationClientConnectionRequest[];

    public async findAutomationClients(): Promise<AutomationClientInfo[]> {
        const answers = this.requests.map(request =>
            fetchMetadataFromAutomationClient(request)
                .catch(() => undefined));
        return Promise.all(answers).then(arr => arr.filter(a => !!a.client));
    }

    constructor(...requests: AutomationClientConnectionRequest[]) {
        this.requests = requests;
    }

}
