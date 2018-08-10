import * as assert from "assert";

export interface CommandLine {
    words: string[],
    positionalArguments: string[],
    firstWord: string,
}


export function parseCommandLine(s: string): CommandLine {
    const allWords = s.split(" ");
    const firstPositionalArgument = allWords.findIndex(isPositionalArgument);
    if (firstPositionalArgument < 0) {
        return new CommandLineImpl(allWords, []);
    }
    const result = new CommandLineImpl(allWords.splice(0, firstPositionalArgument),
        allWords.splice(firstPositionalArgument - 1))
    // could verify that all positionalArguments are positional arguments
    assert(s === result.toString(), `Command line parsed incorrectly: ${s} parsed to ${result}`)
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
    return /^<.*>$/.test(w) || /^\[.*\]/.test(w)
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
