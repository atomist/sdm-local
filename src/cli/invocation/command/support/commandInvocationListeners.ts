/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import axios from "axios";
import * as boxen from "boxen";
import { defaultHostUrlAliaser } from "../../../../common/util/http/defaultLocalHostUrlAliaser";
import { infoMessage } from "../../../ui/consoleOutput";
import { AllMessagesPort } from "../addStartListenerCommand";
import { CommandInvocationListener } from "./runCommandOnCollocatedAutomationClient";

/**
 * Display the description of a command before invoking it
 * @type {{before: (chm) => Promise<void>}}
 */
export const ShowDescriptionListener: CommandInvocationListener = {
    before: async chm => {
        if (!!chm.description) {
            infoMessage(chm.description + "\n");
        }
    },
};

/**
 * Send a message to the Atomist listener
 * @type {{before: (chm) => Promise<void>}}
 */
export const PostToAtomistListenerListener: CommandInvocationListener = {
    onDispatch: async chm => {
        const url = `http://${defaultHostUrlAliaser().alias()}:${AllMessagesPort}/write`;
        const message = boxen(`Starting execution of command ${chm.name}`, { padding: 1}) + "\n";
        try {
            await axios.post(url, { message });
        } catch (err) {
            // Ignore any error
        }
    },
};
