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

import { HandlerResult, logger, Secrets } from "@atomist/automation-client";
import { replacer } from "@atomist/automation-client/internal/transport/AbstractRequestProcessor";
import * as stringify from "json-stringify-safe";
import * as assert from "power-assert";
import { EventSender } from "../../../common/EventHandlerInvocation";
import { newCorrelationId } from "../../../sdm/configuration/correlationId";
import { AutomationClientConnectionConfig, AutomationClientConnectionRequest } from "./AutomationClientConnectionConfig";
import { postToSdm } from "./support/httpInvoker";

/**
 * Invoke an event handler on the automation client at the given location
 * @param {AutomationClientConnectionConfig} config
 * @return {Promise<HandlerResult>}
 */
export function invokeEventHandlerUsingHttp(config: AutomationClientConnectionRequest,
                                            teamId: string,
                                            correlationId?: string): EventSender {
    return async invocation => {
        const data = {
            extensions: {
                operationName: invocation.name,
                query_id: "q-" + Date.now(),
                team_id: teamId,
                // TODO fix
                team_name: teamId,
                correlation_id: correlationId || newCorrelationId(),
            },
            secrets: (invocation.secrets || []).concat([
                { uri: "github://user_token?scopes=repo,user:email,read:user", value: process.env.GITHUB_TOKEN },
                { uri: "github://org_token", value: process.env.GITHUB_TOKEN },
                { uri: Secrets.OrgToken, value: process.env.GITHUB_TOKEN },
                { uri: Secrets.UserToken, value: process.env.GITHUB_TOKEN },
            ]),
            api_version: "1",
            data: invocation.payload,
        };

        const url = `/event`;
        logger.info("Sending %s to event %s using %s", url, invocation.name, stringify(data, replacer));
        assert(!!config, "Config must be provided");
        assert(!!config.baseEndpoint, "Base endpoint must be provided: saw " + JSON.stringify(config));
        const resp = await postToSdm(config, url, data);
        assert(resp.code !== 0,
            "Event handler did not succeed. Returned: " + JSON.stringify(resp, null, 2));
        return resp;
    };
}
