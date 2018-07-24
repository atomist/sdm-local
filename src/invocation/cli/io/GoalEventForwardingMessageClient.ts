import { Destination, MessageClient, MessageOptions, SlackMessageClient } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";

import { logger } from "@atomist/automation-client";
import { SdmGoalKey, SdmGoalState } from "@atomist/sdm";
import { OnAnyRequestedSdmGoal } from "@atomist/sdm";
import { AutomationClientConnectionConfig } from "../../http/AutomationClientConnectionConfig";
import { invokeEventHandler } from "../../http/EventHandlerInvocation";

export function isSdmGoalStoreOrUpdate(o: any): o is (SdmGoalKey & {
    state: SdmGoalState;
}) {
    const maybe = o as SdmGoalKey;
    return !!maybe.name && !!maybe.environment;
}

/**
 * Forward goals only. Will dispatch goal events to the appropriate event handler
 * within the SDM at the known address
 */
export class GoalEventForwardingMessageClient implements MessageClient, SlackMessageClient {

    public async respond(msg: string | SlackMessage, options?: MessageOptions): Promise<any> {
    }

    public async send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        logger.debug("MessageClient.send: Raw mesg=\n%j\n", msg);
        if (isSdmGoalStoreOrUpdate(msg)) {
            logger.info("Storing SDM goal or ingester payload %j", msg);
            let handlerNames: string[] = [];
            switch (msg.state) {
                case SdmGoalState.requested:
                    handlerNames = ["OnAnyRequestedSdmGoal"];
                    break;
                case SdmGoalState.failure :
                    handlerNames = ["OnAnyCompletedSdmGoal", "OnAnyFailedSdmGoal"];
                    break;
                case SdmGoalState.success:
                    handlerNames = ["OnAnyCompletedSdmGoal", "OnAnySuccessfulSdmGoal"];
                    break;
            }
            const payload: OnAnyRequestedSdmGoal.Subscription = {
                SdmGoal: [msg],
            };
            return Promise.all(handlerNames.map(name =>
                invokeEventHandler(this.connectionConfig, {
                    name,
                    payload,
                })));
        }
    }

    public async addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {

    }

    public async addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {

    }

    public constructor(private readonly connectionConfig: AutomationClientConnectionConfig) {
    }

}
