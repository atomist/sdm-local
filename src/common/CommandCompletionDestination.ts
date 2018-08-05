import { CustomEventDestination } from "@atomist/automation-client/spi/message/MessageClient";

/**
 * Well-known destination for messages on command completion
 * @type {CustomEventDestination}
 */
export const CommandCompletionDestination = new CustomEventDestination("completion");
