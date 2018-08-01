import { Action, SlackMessage } from "@atomist/slack-messages";
import { logger } from "@atomist/automation-client";

export const ActionRoute = "/action";

/**
 * Save all the actions we have sent, so that we can retrieve them by key later
 * This lets us put short links on the console, and invoke commands with them
 *
 * it's really a URL shortener. I didn't find any in-memory shorteners lying around as middleware
 */
export interface ActionStore {

    storeActions(sm: SlackMessage): Promise<void>;

    getAction(key: ActionKey): Promise<Action>;

}

type ActionKey = string;

export function freshActionStore(): ActionStore {
    return new InMemoryMessageStore();
}

class InMemoryMessageStore {

    public async storeActions(sm: SlackMessage) {
        logger.info("Storing actions for message: %s", (sm as any).key);
        return;
    }

    public async getAction(key: ActionKey) {
        logger.info("Getting action: %s", key)
        return null;
    }
}

export function actionKey(message: SlackMessage, index: number): ActionKey {
    logger.info("Jess, determining message key: %s or %s");
    const messageKey = (message as any).key || (message as any).ts;
    return `${messageKey}-${index}`;
}

export function actionDescription(action: Action): string {
    return encodeURI(action.text).replace("/", "%2F");
}