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

import { replacer } from "@atomist/automation-client/lib/internal/util/string";
import * as stringify from "json-stringify-safe";
import { EventSender } from "../../../common/invocation/EventHandlerInvocation";
import { InvocationTarget } from "../../../common/invocation/InvocationTarget";
import { credentialsFromEnvironment } from "../../../sdm/binding/EnvironmentTokenCredentialsResolver";
import { AutomationClientConnectionRequest } from "./AutomationClientConnectionRequest";
import { postToSdm } from "./support/httpInvoker";
import { newCliCorrelationId } from "./support/newCorrelationId";

import * as assert from "assert";
import { AutomationClientFinder } from "./AutomationClientFinder";
import { Success, Secrets, logger } from "@atomist/sdm/lib/client";

/**
 * Invoke the event handler on all these clients
 * @param {AutomationClientFinder} clientFinder
 * @param {InvocationTarget} target
 * @return {EventSender}
 */
export async function invokeEventHandlerUsingHttpOnAll(clientFinder: AutomationClientFinder,
                                                       target: InvocationTarget): Promise<EventSender> {
    const clients = await clientFinder.findAutomationClients();
    return async invocation => {
        await Promise.all(clients.map(client =>
            invokeEventHandlerUsingHttp(client.location, target)(invocation)));
        return Success;
    };
}

/**
 * Return an event invoker using HTTP to the given address
 * @return {Promise<HandlerResult>}
 */
export function invokeEventHandlerUsingHttp(location: AutomationClientConnectionRequest,
                                            target: InvocationTarget): EventSender {
    assert(!!target);
    return async invocation => {
        const token = credentialsFromEnvironment().token;
        const data = {
            extensions: {
                operationName: invocation.name,
                query_id: "q-" + Date.now(),
                team_id: target.workspaceId,
                team_name: target.workspaceName,
                correlation_id: target.correlationId || await newCliCorrelationId(),
            },
            secrets: (invocation.secrets || []).concat([
                { uri: "github://user_token?scopes=repo,user:email,read:user", value: token },
                { uri: "github://org_token", value: token },
                { uri: Secrets.OrgToken, value: token },
                { uri: Secrets.UserToken, value: token },
            ]),
            api_version: "1",
            data: invocation.payload,
        };

        const url = `/event`;
        logger.info("Calling url %s to handler %s using %s",
            url, invocation.name, stringify(data, replacer));
        assert(!!location, "HTTP location must be provided");
        assert(!!location.baseEndpoint, "Base endpoint must be provided: saw " + JSON.stringify(location));
        const resp = await postToSdm(location, url, data);
        assert(resp.code !== 0,
            "Event handler did not succeed. Returned: " + JSON.stringify(resp, undefined, 2));
        return resp;
    };
}
