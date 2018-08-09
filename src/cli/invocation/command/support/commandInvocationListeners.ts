import { infoMessage } from "../../../ui/consoleOutput";
import { CommandInvocationListener } from "./runCommandOnCollocatedAutomationClient";

export const ShowDescriptionListener: CommandInvocationListener = {
    before: async chm => {
       if (!!chm.description) {
           infoMessage(chm.description + "\n");
       }
    },
};
