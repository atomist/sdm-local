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

import * as inquirer from "inquirer";
import * as _ from "lodash";
import yargs = require("yargs");
import {
    handleFunctionFromInstructions,
    HandleInstructions,
} from "./handleInstruction";
import {
    BuildYargs,
    Built,
    dropWithWarningsInHelp,
    isPromptForChoice,
    ResolveConflictWithPrompt,
    YargCommand,
    YargRunnableCommandSpec,
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
    const [essential, nonessential] = _.partition(yss, yc => yc.conflictResolution.kind !== "drop with warnings");
    const nonessentialChildren = nonessential
        .map(yc => yc as YargCommandWord)
        .filter(yc => yc.nestedCommands && yc.nestedCommands.length > 0)
        .map(wrapChildren);

    const warnings = nonessential.map(ys =>
        `Warning: ${descriptionForConflictWarning(ys)} is not available because it conflicts with another command`);
    return [[...essential, ...nonessentialChildren], warnings];
}

function wrapChildren(yc: YargCommandWord): YargCommandWord {
    return new YargCommandWord({
        commandName: yc.commandName,
        description: yc.description,
        conflictResolution: yc.conflictResolution,
        nestedCommands: yc.nestedCommands,
        // NOT the runnable command
    });
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
            kind: "expected to be unique",
            failEverything: true,
            commandDescription: "This is already a combined command. Don't call build() twice",
        },
        warnings,
    });

}

function combineIntoPrompt(ycs: YargCommand[]): [YargCommand[], string[]] {
    const [promptable, rest] = _.partition(ycs, yc => isPromptForChoice(yc.conflictResolution));

    const [uniqueChoices, duplicatedChoices] = checkChoicesForUniqueness(promptable);
    const warnings = warningsFromDuplicateChoices(duplicatedChoices);

    if (uniqueChoices.length === 0) {
        return [rest, warnings];
    }
    if (uniqueChoices.length === 1) {
        return [[uniqueChoices[0], ...rest], warnings];
    }

    return [[constructPromptCommandFrom(uniqueChoices), ...rest], warnings];
}

function warningsFromDuplicateChoices(duplicatedChoices: YargCommand[]): string[] {
    return duplicatedChoices.map(yc =>
        `WARNING: Command '${yc.conflictResolution.commandDescription}' not available. Duplicate name: ${
        yc.commandName} Duplicate choice: ${
        (yc.conflictResolution as ResolveConflictWithPrompt).uniqueChoice}`);

}

function checkChoicesForUniqueness(
    promptableCommands: YargCommand[] /* with conflictResolution of prompt for choice */): [YargCommand[], YargCommand[]] {
    return [promptableCommands, []]; // TODO: implement
}

function constructPromptCommandFrom(promptableCommands: YargCommand[] /* with conflictResolution of prompt for choice */): YargCommand {
    return new YargCommandWord({
        commandName: promptableCommands[0].commandName,
        description: _.uniq(promptableCommands.map(y => y.description)).join(" or "),
        runnableCommand: combineChoicesIntoRunnableCommand(promptableCommands),
        nestedCommands: _.flatMap(promptableCommands.map(ys => (ys as YargCommandWord).nestedCommands)),
        conflictResolution: dropWithWarningsInHelp(`Choice: ${
            _.uniq(promptableCommands.map(c => c.conflictResolution.commandDescription)).join(" or ")}`),
    });
}

function combineChoicesIntoRunnableCommand(promptableCommands: YargCommand[]): YargRunnableCommandSpec {
    const runnableOnes = promptableCommands.filter(pc => pc.isRunnable).map(pc => pc as YargCommandWord);
    return {
        description: "Choice: " + _.uniq(runnableOnes.map(r => r.runnableCommand.description)).join(" or "),
        commandLine: runnableOnes[0].runnableCommand.commandLine,
        handleInstructions: promptAndRun(runnableOnes),
        parameters: _.flatMap(runnableOnes, rc => rc.runnableCommand.parameters),
        positional: [],
    };
}

function promptAndRun(runnableOnes: YargCommandWord[]): HandleInstructions {
    return {
        fn: async args => {
            const question: inquirer.Question<{ selection: string }> = {
                type: "list",
                name: "selection",
                message: "There is more than one way to do that. Choose one:",
                choices: runnableOnes.map(rc => (rc.conflictResolution as ResolveConflictWithPrompt).uniqueChoice),
            };
            const answer = await inquirer.prompt<{ selection: string }>([question]);
            const winner = runnableOnes.find(r => (r.conflictResolution as ResolveConflictWithPrompt).uniqueChoice === answer.selection);
            return handleFunctionFromInstructions(winner.runnableCommand.handleInstructions)(args);
        },
    };
}

function contributeOnlyHelpMessages(formerCommandName: string, ms: string[]): BuildYargs {
    return {
        build(): Built {
            return {
                helpMessages: ms,
                descriptions: [],
                commandName: formerCommandName,
                save(v: yargs.Argv): yargs.Argv {
                    return v;
                },
            };
        },
    };
}
