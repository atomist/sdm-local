import { CommandInvocationListener } from "./runCommandOnCollocatedAutomationClient";
import { infoMessage } from "../../../ui/consoleOutput";

export const ShowDescriptionListener: CommandInvocationListener = {
    before: async chm => {
       if (!!chm.description) {
           infoMessage(chm.description + "\n");
       }
    }
};