import { logger } from "@atomist/automation-client";
import {
    Destination,
    MessageClient,
    MessageOptions,
    SlackMessageClient,
} from "@atomist/automation-client/spi/message/MessageClient";
import {
    OnAnyRequestedSdmGoal,
    SdmGoalKey,
    SdmGoalState,
} from "@atomist/sdm";
import { SlackMessage } from "@atomist/slack-messages";
import { isValidSHA1 } from "../../invocation/git/handlePushBasedEventOnRepo";
import { AutomationClientConnectionConfig } from "../../invocation/http/AutomationClientConnectionConfig";
import { invokeEventHandler } from "../../invocation/http/EventHandlerInvocation";

export function isSdmGoalStoreOrUpdate(o: any): o is (SdmGoalKey & {
    state: SdmGoalState;
    sha: string;
    branch: string;
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
        // Ignore
    }

    public async send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        logger.debug("MessageClient.send: Raw mesg=\n%j\n", msg);
        if (isSdmGoalStoreOrUpdate(msg)) {
            logger.info("Storing SDM goal or ingester payload %j", msg);
            if (isValidSHA1((msg.branch))) {
                throw new Error("Branch/sha confusion in " + JSON.stringify(msg));
            }
            if (!isValidSHA1((msg.sha))) {
                throw new Error("Invalid sha in " + JSON.stringify(msg));
            }
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

            // We want to return to let this work in the background
            // tslint:disable-next-line:no-floating-promises
            Promise.all(handlerNames.map(name =>
                invokeEventHandler(this.connectionConfig, {
                    name,
                    payload,
                })));
        }
    }

    public async addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        // Ignore
    }

    public async addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        // Ignore
    }

    public constructor(private readonly connectionConfig: AutomationClientConnectionConfig) {
    }

}
