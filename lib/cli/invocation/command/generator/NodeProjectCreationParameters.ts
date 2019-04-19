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

import {
    MappedParameters,
    SeedDrivenGeneratorParameters,
} from "@atomist/automation-client";
import {
    DeclarationType,
    ParametersObject,
    SemVerRegExp,
} from "@atomist/sdm";

// This code is based on sdm-pack-node, but deliberately duplicated
// here to avoid a dependency

/**
 * Parameters for creating Node projects.
 */
export interface NodeProjectCreationParameters extends SeedDrivenGeneratorParameters {
    screenName: string;
    version: string;
}

/**
 * Corresponding parameter definitions
 */
export const NodeProjectCreationParametersDefinition: ParametersObject<any, any> = {

    version: {
        ...SemVerRegExp,
        required: false,
        order: 52,
        defaultValue: "0.1.0",
    },
    screenName: { declarationType: DeclarationType.Mapped, uri: MappedParameters.SlackUserName },
};
