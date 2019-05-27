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

import {
    automationClientInstance,
    CommandIncoming,
    HandlerResult,
    Success,
} from "@atomist/automation-client";
import { CommandHandlerInvoker } from "../../common/invocation/CommandHandlerInvocation";
import { propertiesToArgs } from "../../common/util/propertiesToArgs";
import { credentialsFromEnvironment } from "../binding/EnvironmentTokenCredentialsResolver";

export type CommandHandlerCallback = (result: Promise<HandlerResult>) => void;
const DefaultCommandHandlerCallback = () => { /* intentionally left empty */ };

export function invokeCommandHandlerInProcess(callback: CommandHandlerCallback = DefaultCommandHandlerCallback): CommandHandlerInvoker {
    return async invocation => {
        const parameters = propertiesToArgs(invocation.parameters);
        const data = {
            command: invocation.name,
            parameters,
            mapped_parameters: propertiesToArgs(invocation.mappedParameters || {}).concat([
                { name: "slackTeam", value: invocation.workspaceId },
            ]).concat(parameters), // mapped parameters can also be passed in
            secrets: (invocation.secrets || []).concat([
                { uri: "github://user_token?scopes=repo,user:email,read:user", value: credentialsFromEnvironment().token },
            ]),
            // tslint:disable-next-line:variable-name
            correlation_id: invocation.correlationId,
            // tslint:disable-next-line:variable-name
            api_version: "1",
            team: {
                id: invocation.workspaceId,
                name: invocation.workspaceName,
            },
        };

        await automationClientInstance().processCommand(data as CommandIncoming, callback);

        return Success;
    };
}
