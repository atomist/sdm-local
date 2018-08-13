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
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { logExceptionsToConsole } from "../../ui/consoleOutput";
import { YargSaver } from "./support/yargSaver";

export function addShowSkillsCommand(ai: AutomationClientInfo, yargs: YargSaver) {
    yargs.command({
        command: "show skills",
        aliases: "s",
        describe: "Show skills",
        handler: () => {
            return logExceptionsToConsole(async () => {
                const commands = ai.client.commands;
                commands.forEach(md => {
                    let msg = "\t" + chalk.cyan(md.intent.map(intent => `"${intent}"`).join(","));
                    msg += "\t" + chalk.green(md.name);
                    msg += "\t" + chalk.gray(md.description);
                    process.stdout.write(msg + "\n");
                });
            }, ai.connectionConfig.showErrorStacks);
        },
    });
}
