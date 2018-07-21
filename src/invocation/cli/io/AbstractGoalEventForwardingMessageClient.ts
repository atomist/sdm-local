import { Destination, MessageClient, MessageOptions, SlackMessageClient } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";

import { logger } from "@atomist/automation-client";
import { SdmGoalKey, SdmGoalState } from "@atomist/sdm";
import { OnAnyRequestedSdmGoal } from "@atomist/sdm-core/typings/types";
import { DefaultConfig } from "../../AutomationClientInfo";
import { invokeEventHandler } from "../../http/EventHandlerInvocation";

function isSdmGoalStoreOrUpdate(o: any): o is (SdmGoalKey & {
    state: SdmGoalState;
}) {
    const maybe = o as SdmGoalKey;
    return !!maybe.name && !!maybe.environment;
}

/**
 * Forward goals
 */
export abstract class AbstractGoalEventForwardingMessageClient implements MessageClient, SlackMessageClient {

    public abstract respond(msg: string | SlackMessage, options?: MessageOptions): Promise<any>;

    protected abstract sendInternal(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any>;

        // TODO this should be independent of where it's routed
    public async send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        logger.info("MessageClient.send: Raw mesg=\n%j\n", msg);
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
            // process.stdout.write(JSON.stringify(payload));
            // Don't wait for them
            Promise.all(handlerNames.map(name =>
                invokeEventHandler(DefaultConfig, {
                    name,
                    payload,
                })));
            return;
        }
        return this.sendInternal(msg, destinations, options);
    }

    public abstract addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any>;

    public abstract addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any>;

    // private renderAction(channel: string, action: slack.Action) {
    //     if (action.type === "button") {
    //         // TODO fix hardcoding (use config), and need to update to call local client
    //         const a = action as any;
    //         let url = `http://localhost:6660/command/${a.command.name}?`;
    //         Object.getOwnPropertyNames(a.command.parameters).forEach(prop => {
    //             url += `${prop}=${a.command.parameters[prop]}`;
    //         });
    //         this.writeToChannel(channel, `${action.text} - ${url}`);
    //     } else {
    //         process.stdout.write(JSON.stringify(action) + "\n");
    //     }
    // }

}
