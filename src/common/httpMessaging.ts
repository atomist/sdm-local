import { Destination, MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import { AutomationClientConnectionRequest } from "../cli/invocation/http/AutomationClientConnectionConfig";

export const MessageRoute = "/message";

/**
 * Payload data structure used by HTTP message communication
 */
export interface StreamedMessage {
    message: string | SlackMessage;
    destinations: Destination[];
    options: MessageOptions;
    machineAddress: AutomationClientConnectionRequest;
}
