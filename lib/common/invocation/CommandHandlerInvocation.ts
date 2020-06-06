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

import {HandlerResult} from "@atomist/automation-client/lib/HandlerResult";
import {
    Arg,
    Secret,
} from "@atomist/automation-client/lib/internal/invoker/Payload";
import { InvocationTarget } from "./InvocationTarget";

/**
 * Allow params to be expressed in an object for convenience
 */
export interface Params {

    [propName: string]: string | number;
}

export interface CommandHandlerInvocation extends InvocationTarget {
    name: string;
    parameters: Params | Arg[];
    mappedParameters?: Params | Arg[];
    secrets?: Secret[];
}

/**
 * Function that can send a command to an automation client
 */
export type CommandHandlerInvoker = (chi: CommandHandlerInvocation) => Promise<HandlerResult>;
