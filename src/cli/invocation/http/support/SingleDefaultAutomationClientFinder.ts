import { AutomationClientFinder } from "../AutomationClientFinder";

export const SingleDefaultAutomationClientFinder: AutomationClientFinder = {

    findAutomationClientUrls() {
        return Promise.resolve(["http://localhost:2866"]);
    },
};