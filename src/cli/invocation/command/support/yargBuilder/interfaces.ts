
import { Choices, Options as ParameterOptions, PositionalOptions, PositionalOptionsType } from "yargs";

export { PositionalOptions, PositionalOptionsType, Choices, ParameterOptions };

interface BuildYargs {
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
    };
}
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
    /*
     * Contribution to the description displayed on --help
     */
    helpMessages: string[];

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
    command(params: {
        command: string,
        describe: string,
        aliases?: string,
        builder?: (ys: YargBuilder) => (YargBuilder | void),
        handler?: (argObject: any) => Promise<any>,
    }): YargBuilder;
}

export interface YargContributor extends BuildYargs {
    helpMessages: string[];
}


export type CommandLineParameter = ParameterOptions & {
    parameterName: string;
};

export interface ConflictResolution { failEverything: boolean; commandDescription: string; }


// All of the rest of this is exported for interfile use only


export interface YargCommandSpec {
    commandLine: CommandLine;
    description: string;
    handleInstructions: HandleInstructions;
    nestedCommands?: YargCommand[];
    parameters?: CommandLineParameter[];
    configureInner?: (y: YargBuilder) => (YargBuilder | void);
    conflictResolution: ConflictResolution;
}