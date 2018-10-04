import {
    AutomationEventListenerSupport,
    registerShutdownHook,
} from "@atomist/automation-client";
import { AutomationClient } from "@atomist/automation-client/lib/automationClient";
import { codeLine } from "@atomist/slack-messages";
import { newCliCorrelationId } from "../../../cli/invocation/http/support/newCorrelationId";

export class NotifyOnStartupAutomationEventListener extends AutomationEventListenerSupport {

    public async startupSuccessful(client: AutomationClient): Promise<void> {
        const correlationId = await newCliCorrelationId({ channel: "general", encodeListenerPort: true });
        const messageClient = await client.configuration.http.messageClientFactory({ context: { correlationId } } as any);

        const message = `__${client.configuration.sdm.name ? client.configuration.sdm.name : "SDM"}__ ${
            codeLine(`${client.configuration.name}:${client.configuration.version}`)}`;

        await messageClient.respond(`${message} is now connected`);

         registerShutdownHook(async () => {
            await messageClient.respond(`${message} disconnected`);
            return 0;
        });
    }

}