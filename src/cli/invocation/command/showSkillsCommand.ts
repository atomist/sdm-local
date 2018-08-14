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

import chalk from "chalk";
import * as _ from "lodash";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { infoMessage, logExceptionsToConsole } from "../../ui/consoleOutput";
import { YargBuilder } from "./support/yargBuilder";

/**
 * Display the show skills command, backed by the given skills
 * gathered from all connected clients
 * @param {YargBuilder} yargs
 */
export function addShowSkillsCommand(clients: AutomationClientInfo[],
                                     yargs: YargBuilder) {
    const commands = _.flatten(clients.map(client => client.client.commands));
    yargs.command({
        command: "show skills",
        aliases: "s",
        describe: "Show skills",
        handler: () => {
            return logExceptionsToConsole(async () => {
                infoMessage("%s commands are available from %s connected SDMs\n",
                    commands.length, clients.length);
                commands.forEach(md => {
                    let msg = "\t" + chalk.cyan(md.intent.map(intent => `"${intent}"`).join(","));
                    msg += "\t" + chalk.green(md.name);
                    msg += "\t" + chalk.gray(md.description);
                    process.stdout.write(msg + "\n");
                });
            }, true);
        },
    });
}
