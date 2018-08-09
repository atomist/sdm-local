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

import { ExtensionPack, SoftwareDeliveryMachine } from "@atomist/sdm";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { isInLocalMode } from "@atomist/sdm-core";

/**
 * Extension pack that configures SDM for local
 * @type {{name: string; vendor: string; version: string; configure: (sdm) => void}}
 */
export const LocalSdmConfig: ExtensionPack = {
    ...metadata(),
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
function registerNoOpListeners(sdm: SoftwareDeliveryMachine) {
    sdm.addNewRepoWithCodeListener(NoOp)
        .addRepoCreationListener(NoOp)
        .addRepoOnboardingListener(NoOp)
        .addBuildListener(NoOp)
        .addChannelLinkListener(NoOp);
}