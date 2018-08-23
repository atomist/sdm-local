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
    BuildYargs, YargCommand,
} from "./interfaces";
import {
    hasPositionalArguments,
} from "./positional";
import { YargCommandWord } from "./sentences";

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

/**
 * Can we combine all of these commands into one, as they are, would it be a problem?
 * @param yss 
 */
function whyNotCombine(yss: YargCommand[]): ValidationError[] {
    if (yss.length <= 1) {
        return [];
    }
    const reasons: ValidationError[] = [];
    if (yss.some(hasPositionalArguments)) {
        reasons.push({ complaint: "Cannot combine commands with positional arguments", contexts: [] });
    }
    const completeCommands = yss.filter(ys => ys.isRunnable);
    if (completeCommands.length > 1) {
        reasons.push({
            complaint: `There are ${completeCommands.length} complete commands:\n` +
                completeCommands.map(describeConflictingCommand).join("\n"),
            contexts: [],
        });
    }

    return reasons;
}

function describeConflictingCommand(yc: YargCommand): string {
    return `    ${yc.commandName}\t${yc.description}`;
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

export function combine(commandName: string, yss: YargCommand[]): BuildYargs {

    const [combineThese1, warnings1] = thereIsConflict(yss) ? dropNonessentialCommands(yss) : [yss, []];

    const [combineThese2, warnings2] = thereIsConflict(combineThese1) ? combineIntoPrompt(combineThese1) : [combineThese1, []];

    if (thereIsConflict(combineThese2)) {
        // still??
        throw new Error("Unresolvable conflict between commands: " + whyNotCombine(combineThese2).map(errorToString).join("\n"));
    }

    const combineThese = combineThese2;
    const warnings = [...warnings1, ...warnings2];

    if (combineThese.length === 0) {
        return contributeOnlyHelpMessages(commandName, warnings);
    }

    if (combineThese.length === 1) {
        // This might be positional
        const output = combineThese[0];
        output.addHelpMessages(warnings);
        return output;
    }

    // ok. If we got here, we now have multiple commands;
    // none are positional;
    // all may have children
    // but at most one is runnable by itself
    const ycws = combineThese as YargCommandWord[];
    const realCommand = ycws.find(ys => ys.isRunnable);

    return new YargCommandWord({
        commandName,
        description: _.uniq(ycws.map(y => y.description)).join("; or, "),
        runnableCommand: realCommand ? realCommand.runnableCommand : undefined,
        nestedCommands: _.flatMap(ycws.map(ys => ys.nestedCommands)),
        conflictResolution: {
            failEverything: true,
            commandDescription: "This is already a combined command. Don't call build() twice",
        },
        warnings,
    });

}

function combineIntoPrompt(ycs: YargCommand[]): [YargCommand[], string[]] {
    return [ycs, []];
}

function contributeOnlyHelpMessages(formerCommandName: string, ms: string[]): BuildYargs {
    return {
        build() {
            return {
                helpMessages: ms,
                descriptions: [],
                commandName: formerCommandName,
                save(v) {
                    return v;
                },
            };
        },
    };
}
