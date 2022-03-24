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
import * as assert from "power-assert";
import { newCliCorrelationId } from "../../cli/invocation/http/support/newCorrelationId";
import { EventSender } from "../../common/invocation/EventHandlerInvocation";
import { LocalWorkspaceContext } from "../../common/invocation/LocalWorkspaceContext";
import { credentialsFromEnvironment } from "../binding/EnvironmentTokenCredentialsResolver";
import { automationClientInstance, Secrets, logger, EventIncoming, HandlerResult, Success } from "@atomist/sdm/lib/client";

/**
 * Invoke an event handler on the automation client at the given location
 * @return {Promise<HandlerResult>}
 */
export function invokeEventHandlerInProcess(workspaceContext: LocalWorkspaceContext, correlationId?: string): EventSender {
    return async invocation => {
        if (!automationClientInstance()) {
            throw new Error("This function must be invoked inside an automation client locally");
        }

        // tslint:disable-next-line:variable-name
        const team_id = workspaceContext.workspaceId;
        // tslint:disable-next-line:variable-name
        const team_name = workspaceContext.workspaceName;
        const token = credentialsFromEnvironment().token;

        const data = {
            extensions: {
                operationName: invocation.name,
                query_id: "q-" + Date.now(),
                team_id,
                team_name,
                correlation_id: correlationId || await newCliCorrelationId(),
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

        logger.log("silly", "Invoking %s using %s", invocation.name, stringify(data, replacer));
        automationClientInstance().processEvent(data as any as EventIncoming, async result => {
            const results = (Array.isArray(result) ? result : [result]) as HandlerResult[];
            assert(results.find(r => r.code !== 0),
                "Event handler did not succeed. Returned: " + JSON.stringify(result, undefined, 2));
            return results;
        });

        return Success;
    };
}
