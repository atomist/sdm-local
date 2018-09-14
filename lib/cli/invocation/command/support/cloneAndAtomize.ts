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

import { exec } from "child_process";
import * as fs from "fs";
import { promisify } from "util";
import { LocalWorkspaceContext } from "../../../../common/invocation/LocalWorkspaceContext";
import {
    sendChannelLinkEvent,
    sendRepoOnboardingEvent,
} from "../../../../sdm/binding/event/repoOnboardingEvents";
import { AutomationClientInfo } from "../../../AutomationClientInfo";
import { addGitHooks } from "../../../setup/addGitHooks";
import { infoMessage } from "../../../ui/consoleOutput";
import { invokeEventHandlerUsingHttp } from "../../http/invokeEventHandlerUsingHttp";

/**
 * Clone the repo, install Atomist git hooks and send onboarding messages
 */
export async function cloneAndAtomize(args: {
                                          repositoryOwnerDirectory: string,
                                          owner: string,
                                          repo: string,
                                          cloneCommand: string,
                                          clients: AutomationClientInfo[],
                                          workspaceContext: LocalWorkspaceContext,
                                      },
): Promise<any> {
    const { owner, repo} = args;
    const orgDir = args.repositoryOwnerDirectory + "/" + args.owner;
    if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir);
    }
    infoMessage(`Cloning git remote project: ${args.cloneCommand}\n`);
    await promisify(exec)(args.cloneCommand, { cwd: orgDir });
    await addGitHooks(`${args.repositoryOwnerDirectory}/${owner}/${repo}`);
    for (const client of args.clients) {
        const eventSender = invokeEventHandlerUsingHttp(
            client.location,
            args.workspaceContext);
        await sendRepoOnboardingEvent(args.workspaceContext, { owner, repo, url: undefined }, eventSender);
        await sendChannelLinkEvent(args.workspaceContext, { owner, repo, url: undefined }, eventSender);
    }
}
