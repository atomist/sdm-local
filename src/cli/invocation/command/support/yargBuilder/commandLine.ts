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

import * as assert from "assert";

export interface CommandLine {
    words: string[];
    positionalArguments: string[];
    firstWord: string;
}

export function parseCommandLine(s: string): CommandLine {
    const allWords = s.split(" ");
    const firstPositionalArgument = allWords.findIndex(isPositionalArgument);
    if (firstPositionalArgument < 0) {
        return new CommandLineImpl(allWords, []);
    }
    const result = new CommandLineImpl(
        allWords.slice(0, firstPositionalArgument),
        allWords.slice(firstPositionalArgument));
    // could verify that all positionalArguments are positional arguments
    assert(s === result.toString(), `Command line parsed incorrectly: ${s} parsed to ${result}`);
    return result;
}

export function dropFirstWord(commandLine: CommandLine): CommandLine {
    return new CommandLineImpl(commandLine.words.splice(1), commandLine.positionalArguments);
}

export function commandLineAlias(commandLine: CommandLine, alias: string): CommandLine {
    assert(!alias.includes(" "), "multiword aliases not supported: " + alias);
    return new CommandLineImpl([alias], commandLine.positionalArguments);
}

function isPositionalArgument(w: string) {
    return /^<.*>$/.test(w) || /^\[.*\]/.test(w);
}

export function verifyOneWord(commandLine: CommandLine) {
    if (commandLine.words.length > 1) {
        throw new Error("You can only have one word if there are positional arguments");
    }
}

class CommandLineImpl implements CommandLine {
    constructor(public readonly words: string[],
        public readonly positionalArguments: string[]) { }

    public get firstWord() {
        return this.words[0];
    }

    public toString() {
        return [...this.words, ...this.positionalArguments].join(" ");
    }
}
