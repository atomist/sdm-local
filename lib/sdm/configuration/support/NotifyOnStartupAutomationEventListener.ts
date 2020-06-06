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

import { AutomationClient } from "@atomist/automation-client/lib/automationClient";
import {registerShutdownHook} from "@atomist/automation-client/lib/internal/util/shutdown";
import {AutomationEventListenerSupport} from "@atomist/automation-client/lib/server/AutomationEventListener";
import { codeLine } from "@atomist/slack-messages";
import { newCliCorrelationId } from "../../../cli/invocation/http/support/newCorrelationId";

/**
 * Notify the local feed that an SDM is now connected and ready to receive traffic.
 */
export class NotifyOnStartupAutomationEventListener extends AutomationEventListenerSupport {

    public async startupSuccessful(client: AutomationClient): Promise<void> {
        const correlationId = await newCliCorrelationId({ channel: "general", encodeListenerPort: true });
        const messageClient = client.configuration.http.messageClientFactory({ context: { correlationId } } as any);

        const message = `__${client.configuration.sdm.name ? client.configuration.sdm.name : "SDM"}__ ${
            codeLine(`${client.configuration.name}:${client.configuration.version}`)}`;

        await messageClient.respond(`${message} is now connected`);

        registerShutdownHook(async () => {
            await messageClient.respond(`${message} disconnected`);
            return 0;
        }, 5000, "send shutdown chat message");
    }

}
