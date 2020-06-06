/*
 * Copyright © 2019 Atomist, Inc.
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

import {isInLocalMode} from "@atomist/sdm-core/lib/internal/machine/modes";
import {metadata} from "@atomist/sdm/lib/api-helper/misc/extensionPack";
import {onAnyPush} from "@atomist/sdm/lib/api/dsl/goalDsl";
import {ExtensionPack} from "@atomist/sdm/lib/api/machine/ExtensionPack";
import {SoftwareDeliveryMachine} from "@atomist/sdm/lib/api/machine/SoftwareDeliveryMachine";

/**
 * Extension pack that configures SDM for local
 * @type {{name: string; vendor: string; version: string; configure: (sdm) => void}}
 */
export const LocalSdmConfig: ExtensionPack = {
    ...metadata("local-config"),
    configure: sdm => {
        if (isInLocalMode()) {
            registerNoOpListeners(sdm);
        }
    },
};

const NoOp = () => Promise.resolve();

/**
 * Register no op listeners to ensure all handlers are emitted,
 * avoiding sdm-core optimization
 * @param {SoftwareDeliveryMachine} sdm
 */
function registerNoOpListeners(sdm: SoftwareDeliveryMachine): void {
    sdm.addFirstPushListener(NoOp)
        .addRepoCreationListener(NoOp)
        .addRepoOnboardingListener(NoOp)
        .addChannelLinkListener(NoOp);
    // Ensure there's a push mapping, even if it doesn't return anything
    sdm.addGoalContributions(onAnyPush().setGoals([]));
}
