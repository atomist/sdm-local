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

import * as _ from "lodash";
import * as yargs from "yargs";
import { combine } from "./combining";
import {
    CommandLineParameter,
    isYargCommand,
    ParameterOptions,
    SupportedSubsetOfYargsCommandMethod,
    YargBuilder,
    YargCommand,
} from "./interfaces";
import { imitateYargsCommandMethod } from "./sentences";

export function freshYargBuilder(opts: { epilogForHelpMessage?: string } = {}): YargBuilder {
    return new YargBuilderTopLevel(opts);
}

export function isYargBuilder(ya: yargs.Argv | YargBuilder): ya is YargBuilder {
    return !!(ya as YargBuilder).build;
}

class YargBuilderTopLevel implements YargBuilder {
    public epilogsForHelpMessage: string[];
    public readonly nestedCommands: YargCommand[] = [];
    public readonly parameters: CommandLineParameter[] = [];

    constructor(opts: { epilogForHelpMessage?: string }) {
        this.epilogsForHelpMessage = opts.epilogForHelpMessage ? [opts.epilogForHelpMessage] : [];
    }

    public demandCommand() {
        // no-op. Only here for compatibility with yargs syntax.
        // We can figure out whether to demand a command.
        return this;
    }

    public command(params: SupportedSubsetOfYargsCommandMethod): this {
        const newCommands = imitateYargsCommandMethod(params);
        newCommands.forEach(c => this.nestedCommands.push(c));
        return this;
    }

    public withParameter(p: CommandLineParameter) {
        this.parameters.push(p);
        return this;
    }

    public withSubcommand(c: YargCommand | SupportedSubsetOfYargsCommandMethod): this {
        if (isYargCommand(c)) {
            this.nestedCommands.push(c);
        } else {
            this.command(c);
        }
        return this;
    }

    public option(parameterName: string,
                  opts: ParameterOptions): YargBuilder {
        this.withParameter({
            parameterName,
            ...opts,
        });
        return this;
    }

    public build() {
        const self = this;
        const commandsByNames = _.groupBy(this.nestedCommands, nc => nc.commandName);
        const nestedCommandSavers = Object.entries(commandsByNames).map(([k, v]) =>
            combine(k, v).build());
        const helpMessages = [
            ..._.flatMap(nestedCommandSavers, nc => nc.helpMessages),
            ...this.epilogsForHelpMessage];

        return {
            commandName: "top",
            helpMessages,
            nested: nestedCommandSavers,
            descriptions: [] as string[],
            save(y: yargs.Argv): yargs.Argv {
                _.sortBy(nestedCommandSavers, n => n.commandName).forEach(c => c.save(y));
                if (self.nestedCommands && self.nestedCommands.length > 0) {
                    y.demandCommand();
                    y.recommendCommands();
                }
                self.parameters.forEach(p =>
                    y.option(p.parameterName, p));
                y.showHelpOnFail(true);
                y.epilog(helpMessages.join("\n"));
                return y;
            },
        };
    }
}
