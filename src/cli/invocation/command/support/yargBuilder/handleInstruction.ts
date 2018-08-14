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

import * as stringify from "json-stringify-safe";
import { Arguments } from "./interfaces";

export type HandleInstructions = RunFunction | DoNothing;

type DoNothing = "do nothing";
export const DoNothing: DoNothing = "do nothing";

interface RunFunction {
    fn: (argObject: Arguments) => Promise<any>;
}

export function doesSomething(hi: HandleInstructions): boolean {
    return hi !== DoNothing;
}

export function handleFunctionFromInstructions(instr: HandleInstructions):
    (argObject: any) => Promise<any> | undefined {
    if (instr === DoNothing) {
        return async args => {
            process.stdout.write("I was told to do nothing. Args: " + stringify(args));
        };
    }
    return instr.fn;
}

export function handleInstructionsFromFunction(fn?: (argObject: Arguments) => any): HandleInstructions {
    if (!fn) {
        return DoNothing;
    }
    return { fn };
}
