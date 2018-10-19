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

import { logger } from "@atomist/automation-client";
import {
    ExtensionPack,
    GoalCompletionListener,
    GoalCompletionListenerInvocation,
    goalKeyString,
    metadata,
    onAnyPush,
    SdmGoalEvent,
    SdmGoalState,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import {
    isGitHubAction,
    isInLocalMode,
} from "@atomist/sdm-core";

/**
 * Extension pack that configures SDM for local
 * @type {{name: string; vendor: string; version: string; configure: (sdm) => void}}
 */
export const LocalSdmConfig: ExtensionPack = {
    ...metadata("local-config"),
    configure: sdm => {
        if (isInLocalMode() || isGitHubAction()) {
            registerNoOpListeners(sdm);
        }
        if (isGitHubAction()) {
            registerGoalSetListener(sdm);
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
    sdm.addFirstPushListener(NoOp)
        .addRepoCreationListener(NoOp)
        .addRepoOnboardingListener(NoOp)
        .addChannelLinkListener(NoOp);
    // Ensure there's a push mapping, even if it doesn't return anything
    sdm.addGoalContributions(onAnyPush().setGoals([]));
}

function registerGoalSetListener(sdm: SoftwareDeliveryMachine) {
    sdm.addGoalCompletionListener(exitOnGoalCompletion());
}

export function exitOnGoalCompletion(): GoalCompletionListener {
    return async (inv: GoalCompletionListenerInvocation) => {
        const { completedGoal, allGoals } = inv;
        if (process.argv.length >= 3) {
            if (completedGoal.name === process.argv.slice(2).join(" ")) {
                if (completedGoal.state === SdmGoalState.failure) {
                    logger.info("Exciting because %s failed", completedGoal.uniqueName);
                    process.exit(1);
                } else {
                    logger.info("Exciting because goal was success or waiting");
                    process.exit(0);
                }
            }
        } else {
            logger.info("Completed goal: '%s' with '%s' in set '%s'",
                goalKeyString(completedGoal), completedGoal.state, completedGoal.goalSetId);

            if (completedGoal.state === SdmGoalState.failure) {
                logger.info("Exciting because %s failed", completedGoal.uniqueName);
                process.exit(1);
            }
            if (allSuccessful(allGoals)) {
                logger.info("Exciting because all goals success or waiting");
                process.exit(0);
            }
        }
    };
}

function allSuccessful(goals: SdmGoalEvent[]): boolean {
    goals.forEach(g => logger.debug("goal %s is %s", g.name, g.state));
    return !goals.some(g =>
        g.state !== SdmGoalState.success &&
        g.state !== SdmGoalState.stopped &&
        g.state !== SdmGoalState.canceled &&
        g.state !== SdmGoalState.waiting_for_approval &&
        g.state !== SdmGoalState.waiting_for_pre_approval);
}
