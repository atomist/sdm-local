#!/usr/bin/env ts-node

import * as yargs from "yargs";
import { freshYargBuilder, promptForAChoiceWhenNecessary } from "../../../../../../src/cli/invocation/command/support/yargBuilder";

const yb = freshYargBuilder();
yb.withSubcommand({
    command: "do a thing",
    handler: async () => console.log("yes, you did a thing."),
    describe: "say, yes you did a thing",
    conflictResolution: promptForAChoiceWhenNecessary("The first thing", "do a thing yes")
});
yb.withSubcommand({
    command: "do a thing",
    handler: async () => console.log("no, I don't want to do a thing."),
    describe: "say no to doing a thing",
    conflictResolution: promptForAChoiceWhenNecessary("The second thing", "do a thing no")
});
yb.build().save(yargs);

yargs.strict();
yargs.argv;
