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

import { determineDefaultHostUrl } from "../../../../sdm/configuration/defaultLocalSoftwareDeliveryMachineConfiguration";
import { AutomationClientFinder } from "../AutomationClientFinder";
import { FixedAutomationClientFinder } from "./FixedAutomationClientFinder";

/**
 * Connect to the single local default automation client
 * @type {FixedAutomationClientFinder}
 */
export const SingleDefaultAutomationClientFinder: AutomationClientFinder =
    new FixedAutomationClientFinder({
        baseEndpoint: `http://${determineDefaultHostUrl()}::2866`,
    });
