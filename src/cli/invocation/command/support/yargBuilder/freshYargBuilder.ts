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

import * as yargs from "yargs";
import { YargBuilder } from "./interfaces";

export function freshYargBuilder(opts: { commandName?: string, epilogForHelpMessage?: string } = {}): YargBuilder {
    return new YargSaverTopLevel(opts);
}

export function isYargBuilder(ya: yargs.Argv | YargBuilder): ya is YargBuilder {
    return !!(ya as YargBuilder).build;
}



/**
 * A command is expandible in yargs, so you have to be able
 * to build on it here. Implementations that don't allow subcommands
 * can throw exceptions.
 */
export interface YargCommand extends YargBuilder {
    commandName: string;
    description: string;
    isRunnable: boolean;
    conflictResolution: ConflictResolution;
}

export abstract class YargSaverContainer implements YargBuilder {



}

class YargSaverTopLevel extends YargSaverContainer implements YargBuilder {
    public commandName: string;
    public epilogsForHelpMessage: string[];
    constructor(opts: { commandName?: string, epilogForHelpMessage?: string }) {
        super();
        this.commandName = opts.commandName || "top-level";
        this.epilogsForHelpMessage = opts.epilogForHelpMessage ? [opts.epilogForHelpMessage] : []
    }

    public get helpMessages() {
        return [...super.helpMessages, ...this.epilogsForHelpMessage];
    }
}
