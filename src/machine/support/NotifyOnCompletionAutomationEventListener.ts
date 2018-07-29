import { HandlerContext, HandlerResult } from "@atomist/automation-client";
import { AutomationEventListenerSupport } from "@atomist/automation-client/server/AutomationEventListener";
import { CommandInvocation } from "@atomist/automation-client/internal/invoker/Payload";
import { CustomEventDestination } from "@atomist/automation-client/spi/message/MessageClient";

export const CommandCompletionDestination = new CustomEventDestination("completion");

/**
 * Event listener that sends an event on command termination
 */
export class NotifyOnCompletionAutomationEventListener extends AutomationEventListenerSupport {

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<void> {
        return ctx.messageClient.send("Success", CommandCompletionDestination);
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<void> {
        return ctx.messageClient.send("Failure", CommandCompletionDestination);
    }
}