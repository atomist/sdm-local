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

import {
    ExtensionPack,
    Goals,
    metadata,
    whenPushSatisfies,
} from "@atomist/sdm";
import { IsSdm } from "./IsSdm";
import {
    executeLocalSdmDelivery,
    LocalSdmDelivery,
} from "./LocalSdmDelivery";
import { SdmDeliveryOptions } from "./SdmDeliveryOptions";
import { IsInLocalMode } from "@atomist/sdm/lib/core";

/**
 * Extension pack that automatically delivers an SDM
 */
export function sdmCd(options: SdmDeliveryOptions): ExtensionPack {
    return {
        ...metadata(),
        name: "SdmCd",
        configure: sdm => {
            LocalSdmDelivery.with({
                name: "local-delivery",
                goalExecutor: executeLocalSdmDelivery(options),
            });
            sdm.addGoalContributions(
                whenPushSatisfies(IsSdm, IsInLocalMode).setGoals(
                    new Goals("delivery", LocalSdmDelivery)));
        },
    };
}
