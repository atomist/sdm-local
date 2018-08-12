#!/usr/bin/env ts-node

import * as yargs from "yargs";

yargs.command({
    command: "foo",
    describe: "the foo command",
    handler: () => {
        console.log("FOO YOU")
    },
    builder: (yarg) => {
        yarg.showHelpOnFail(true)
        yarg.epilog("innerEpilogue ")
        return yarg;
    }
});
yargs.epilog("EPILOG");
yargs.demandCommand();
yargs.showHelpOnFail(false);
yargs.argv;