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

#!/usr/bin/env ts-node

import * as yargs from "yargs";

// yargs.command({
//     command: "foo",
//     describe: "the foo command",
//     handler: () => {
//         console.log("FOO YOU")
//     },
//     builder: (yarg) => {
//         yarg.showHelpOnFail(true)
//         yarg.epilog("innerEpilogue ")
//         return yarg;
//     }
// });
yargs.epilog("EPILOG");
yargs.demandCommand();
yargs.showHelpOnFail(true);
yargs.argv;
