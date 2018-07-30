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

import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import { LocalMachineConfig } from "..";
import { AutomationClientConnectionConfig } from "./http/AutomationClientConnectionConfig";

/**
 * Information held in client about an automation client that we've connected to
 */
export interface AutomationClientInfo {

    commandsMetadata: CommandHandlerMetadata[];

    connectionConfig: AutomationClientConnectionConfig;

    /**
     * If this is a local machine, include this
     */
    localConfig?: LocalMachineConfig;
}
