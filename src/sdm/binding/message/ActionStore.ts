import { Action, SlackMessage } from "@atomist/slack-messages";
import { logger } from "@atomist/automation-client";
import { computeShaOf } from "@atomist/sdm/api-helper/misc/sha";
import * as _ from "lodash";
import * as jsSHA from "jssha"

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
    return new InMemoryActionStore();
}

class InMemoryActionStore {
    private readonly actionByKey: { [key: string]: Action } = {};

    public async storeActions(sm: SlackMessage) {
        logger.info("Storing actions for message: %s", (sm as any).key);
        _.flatMap(sm.attachments,a => a.actions)
            .forEach((action, i) => {
            this.actionByKey[actionKey(sm, i)] = action;
        });
        return;
    }

    public async getAction(key: ActionKey) {
        logger.info("Getting action: %s", key);
        return this.actionByKey[key];
    }
}

export function actionKey(message: SlackMessage, index: number): ActionKey {
    logger.info("Jess, determining message key: %s or %s");
    const messageKey = (message as any).key || (message as any).ts || computeShortSha(message);
    logger.info("Message key computed: %s", messageKey);
    return `${messageKey}-${index}`;
}

function computeShortSha(message: any) {
    const shaObj = new jsSHA("SHA-1", "TEXT");
    shaObj.update(JSON.stringify(message));
    return shaObj.getHash("HEX");
}

export function actionDescription(action: Action): string {
    return encodeURI(action.text).replace("/", "%2F");
}