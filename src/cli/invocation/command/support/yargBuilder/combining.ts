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
import {
    CommandLineParameter,
    YargCommand,
    YargContributor,
} from "./YargBuilder";
import { parseCommandLine } from "./commandLine";
import { hasPositionalArguments } from "./positional";
import { YargSaverCommandWord } from "./sentences";
import { DoNothing } from "./handleInstruction";

interface ValidationError {
    complaint: string;
    /*
     * command names that this is nested within
     */
    contexts: string[];
}

/**
 * Some commands, we should fail miserably if they're going to conflict.
 * Others will politely yield.
 * @param ysc
 */
function conflictBlocksStartup(ysc: YargCommand): boolean {
    return ysc.conflictResolution.failEverything;
}

function descriptionForConflictWarning(ysc: YargCommand): string {
    return ysc.conflictResolution.commandDescription;
}

function errorToString(ve: ValidationError): string {
    const prefix = ve.contexts.length > 0 ?
        ve.contexts.join(" -> ") + ": " : "";
    return prefix + ve.complaint;
}

function whyNotCombine(yss: YargCommand[]): ValidationError[] {
    const reasons: ValidationError[] = [];
    if (yss.some(hasPositionalArguments)) {
        reasons.push({ complaint: "Cannot combine commands with positional arguments", contexts: [] });
    }
    const yscws = yss; // as Array<YargSaverCommandWord | YargSaverPositionalCommand>;
    const completeCommands = yscws.filter(ys => ys.isRunnable);
    if (completeCommands.length > 1) {
        reasons.push({
            complaint: "There are two complete commands. Descriptions: " + completeCommands.map(c => c.description).join("; "),
            contexts: [],
        });
    }
    const meaningfulInstructions = yscws.filter(ys => ys.isRunnable);
    if (meaningfulInstructions.length > 1) {
        reasons.push({
            complaint: "There are two functions to respond to",
            contexts: [],
        });
    }

    return reasons;
}

function thereIsConflict(yss: YargCommand[]): boolean {
    return whyNotCombine(yss).length > 0;
}

function dropNonessentialCommands(yss: YargCommand[]): [YargCommand[], string[]] {
    const [essential, nonessential] = _.partition(yss, conflictBlocksStartup);
    const warnings = nonessential.map(ys =>
        `Warning: ${descriptionForConflictWarning(ys)} is not available because it conflicts with another command`);
    return [essential, warnings];
}

export function combine(commandName: string, yss: YargCommand[]): YargContributor {
    if (yss.length === 1) {
        return yss[0];
    }
    const [combineThese, warnings] = thereIsConflict(yss) ? dropNonessentialCommands(yss) : [yss, []];

    if (thereIsConflict(combineThese)) {
        // still??
        throw new Error("Unresolvable conflict between commands: " + whyNotCombine(combineThese).map(errorToString).join("\n"));
    }

    if (combineThese.length === 0) {
        return contributeOnlyHelpMessages(warnings)
    }

    const yswcs = combineThese as YargSaverCommandWord[]; // positional would cause conflict

    const realCommand = yswcs.find(ys => ys.isRunnable) || {
        handleInstructions: DoNothing,
        parameters: [] as CommandLineParameter[],
    };

    return new YargSaverCommandWord(parseCommandLine(commandName),
        _.uniq(yswcs.map(y => y.description)).join("; or, "),
        realCommand.handleInstructions,
        {
            nestedCommands: _.flatMap(yswcs.map(ys => ys.nestedCommands)),
            parameters: realCommand.parameters,
            conflictResolution: {
                failEverything: true,
                commandDescription: "This is already a combined command. Don't call optimize twice",
            },
            warnings,
        },
    );

}

function contributeOnlyHelpMessages(ms: string[]): YargContributor {
    return {
        helpMessages: ms,
        build() {
            return {
                save(v) {
                    return v;
                }
            }
        }
    }
}
