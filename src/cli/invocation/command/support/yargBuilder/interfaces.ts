
import { Choices, Options as ParameterOptions, PositionalOptions, PositionalOptionsType } from "yargs";
import * as yargs from "yargs";
import { CommandLine } from "./commandLine";
import { HandleInstructions } from "./handleInstruction";

export { PositionalOptions, PositionalOptionsType, Choices, ParameterOptions };


/**
 * Build up data about commands, and then put them in yargs later.
 * The YargBuilder lets you add lots of commands, including ones with spaces in them.
 * Then optimize it, to combine all the commands optimally.
 * You'll get errors if you've added duplicate commands (they won't overwrite each other).
 *
 * To use it:
 * Get a new one:
 * const yargBuilder = freshYargBuilder();
 *
 * Add commands to it:
 * yargBuilder.withSubcommand(yargCommandFromSentence({ command: "do this thing already", handler: (argv)=> console.log("stuff")}))
 *
 * You can also add positional commands:
 * yargBuilder.withSubcommand(yargCommandWithPositionalArguments({ command: "run <thing>", ...}))
 *
 * Then optimize it, and save by passing a real yargs:
 * yargBuilder.build().save(yargs)
 *
 */

export interface YargBuilder extends BuildYargs {

    withSubcommand(command: YargCommand): void;
    withParameter(p: CommandLineParameter): void;

    // compatibility with Yargs
    /**
    * This exists to be compatible with yargs syntax
    * once we aren't using it, we could remove it
    * @param params
    * @deprecated
    */
    option(parameterName: string,
        params: ParameterOptions): YargBuilder;
    /**
    * This exists to be compatible with yargs syntax
    * But really, we'll figure out whether to call demandCommand() on yargs
    * based on whether a handler function was supplied
    * @param params
    * @deprecated
    */
    demandCommand(): YargBuilder;

    /**
     * This exists to be compatible with yargs syntax
     * once we aren't using it, we could remove it
     * @param params
     * @deprecated
     */
    command(params: SupportedSubsetOfYargsCommandMethod): YargBuilder;
}


export type CommandLineParameter = ParameterOptions & {
    parameterName: string;
};

export interface ConflictResolution { failEverything: boolean; commandDescription: string; }

export interface YargCommand extends YargBuilder {
    commandName: string;
    description: string;
    conflictResolution: ConflictResolution;
    isRunnable: boolean;
    /*
 * Contribution to the description displayed on --help
 */
    helpMessages: string[];
}

export interface YargRunnableCommandSpec {
    commandLine: CommandLine;
    description: string;
    handleInstructions: HandleInstructions;
    parameters: CommandLineParameter[];
    helpMessages: string[];
    positional: Array<{ key: string, opts: PositionalOptions }>
}

export interface SupportedSubsetOfYargsCommandMethod {
    command: string;
    describe: string;
    aliases?: string;
    builder?: (ys: YargBuilder) => YargBuilder;
    handler?: (argObject: any) => Promise<any>;
}

// internal
export interface YargCommandWordSpec {
    commandName: string;
    description: string;
    conflictResolution: ConflictResolution;
    runnableCommand?: YargRunnableCommandSpec;
    nestedCommands?: YargCommand[];
    warnings?: string[];
}
export interface BuildYargs {
    /**
     * Combine the tree of commands,
     * convert duplicates into warnings.
     * After this, you should only save.
     */
    build(): {
        /**
        * Put everything we know into the real yargs
        * @param  yarg
        */
        save(yarg: yargs.Argv): yargs.Argv;
        /**
         * Contribution to the description displayed on --help
         */
        helpMessages: string[];
    };
}