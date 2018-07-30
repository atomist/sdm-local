#!/usr/bin/env node

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

/*
    Main entry point script
*/

// Disable console logging
 if (!isReservedCommand()) {
    process.env.ATOMIST_DISABLE_LOGGING = "true";
}

 import { runSlalom } from "../invocation/cli/runSlalom";
 import { resolveConnectionConfig } from "./resolveConnectionConfig";

// Prevent loading of metadata for built-in commands
 if (isReservedCommand()) {
    // tslint:disable-next-line:no-floating-promises
    runSlalom();
} else {
    // tslint:disable-next-line:no-floating-promises
    runSlalom(resolveConnectionConfig());
}

 function isReservedCommand() {
    return process.argv.length >= 3 && ["git", "config", "gql-fetch", "gql-gen", "start", "kube"].includes(process.argv[2]);
}
