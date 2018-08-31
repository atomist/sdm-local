#!/usr/bin/env ts-node
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

// tslint:disable:no-console
import * as yargs from "yargs";
import {
    freshYargBuilder,
    promptForAChoiceWhenNecessary,
} from "../../../../../../lib/cli/invocation/command/support/yargBuilder";

const yb = freshYargBuilder();
yb.withSubcommand({
    command: "do a thing",
    handler: async () => console.log("yes, you did a thing."),
    describe: "say, yes you did a thing",
    conflictResolution: promptForAChoiceWhenNecessary("The first thing", "do a thing yes"),
});
yb.withSubcommand({
    command: "do a thing",
    handler: async () => console.log("no, I don't want to do a thing."),
    describe: "say no to doing a thing",
    conflictResolution: promptForAChoiceWhenNecessary("The second thing", "do a thing no"),
});
yb.build().save(yargs);

yargs.strict();
// tslint:disable:no-unused-expression
yargs.argv;
