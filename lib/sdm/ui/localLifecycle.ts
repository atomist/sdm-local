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
    OnPushToAnyBranch,
    ReviewComment,
    SdmGoalEvent,
    SdmGoalState,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { isInLocalMode } from "@atomist/sdm-core";
import { BuildStatusUpdater } from "@atomist/sdm-core/internal/delivery/build/local/LocalBuilder";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import chalk from "chalk";
import Push = OnPushToAnyBranch.Push;
import * as _ from "lodash";
import { DefaultWorkspaceContextResolver } from "../../common/binding/defaultWorkspaceContextResolver";
import { HttpBuildStatusUpdater } from "../binding/HttpBuildStatusUpdater";
import { isFileSystemRemoteRepoRef } from "../binding/project/FileSystemRemoteRepoRef";

/**
 * Add Local IO to the given SDM.
 * Analogous to the Slack lifecycle provided by the Atomist bot.
 * Messages sent are formatted for console output.
 */
export const LocalLifecycle: ExtensionPack = {
    ...metadata("local-lifecycle"),
    configure: sdm => {
        if (isInLocalMode()) {
            addLocalLifecycle(sdm);
            addShowCreatedLocalRepo(sdm);
            addShowReviewResults(sdm);
            const bu = sdm as any as BuildStatusUpdater;
            const buu = new HttpBuildStatusUpdater(DefaultWorkspaceContextResolver.workspaceContext);
            bu.updateBuildStatus = buu.updateBuildStatus.bind(buu);
        }
    },
};

function addShowCreatedLocalRepo(sdm: SoftwareDeliveryMachine) {
    sdm.addChannelLinkListener(async i => {
        if (isFileSystemRemoteRepoRef(i.id)) {
            return i.addressChannels(`🏛  Your new local repo is available at **${i.id.fileSystemLocation}**`);
        }
    });
}

function pushIdentification(pu: Push): string {
    let msg = pu.commits[0].message.split("\n")[0];
    if (msg.length > 50) {
        msg = msg.slice(0, 47) + "...";
    }
    return `\`${pu.repo.owner}/${pu.repo.name}/${pu.branch}\` - \`${pu.commits[0].sha.slice(0, 7)}\` _${msg}_`;
}

function goalIndentification(g: SdmGoalEvent): string {
    return _.lowerFirst(g.name);
}

function linkIndicator(): string {
    return chalk.grey(" >");
}

/**
 * Formatted for the console
 * @param {SoftwareDeliveryMachine} sdm
 */
function addLocalLifecycle(sdm: SoftwareDeliveryMachine) {
    sdm.addPushImpactListener(async pu => {
        return pu.addressChannels(`Push to ${pushIdentification(pu.push)}`);
    });
    sdm.addGoalCompletionListener(async gcl => {
        switch (gcl.completedGoal.state) {
            case SdmGoalState.success:
                return gcl.addressChannels(`${pushIdentification(gcl.completedGoal.push)}
${chalk.green(`✔ ${goalIndentification(gcl.completedGoal)}`)} ${gcl.completedGoal.description}${
                    gcl.completedGoal.externalUrl ? `${linkIndicator()} ${chalk.grey(gcl.completedGoal.externalUrl)}` : ""}`);
            case SdmGoalState.failure:
                return gcl.addressChannels(`${pushIdentification(gcl.completedGoal.push)}
${chalk.red(`✖︎︎ ${goalIndentification(gcl.completedGoal)}`)} ${gcl.completedGoal.description}${
                    gcl.completedGoal.url ? `${linkIndicator()} ${chalk.grey(gcl.completedGoal.url)}` : ""}${
                    gcl.completedGoal.externalUrl ? `${linkIndicator()} ${chalk.grey(gcl.completedGoal.externalUrl)}` : ""}`);
        }
    });
    sdm.addGoalsSetListener(async gsi => {
        const msg = pushIdentification(gsi.push) + (!gsi.goalSet ? "\nNo goals" : `
▸ Goals
${gsi.goalSet.goals.map(g => `⏦ ${chalk.italic(goalIndentification(g as any))}`).join("\n")}`);
        await gsi.addressChannels(msg);
        return gsi.addressChannels({ goalSetId: gsi.goalSetId, goals: gsi.goalSet.goals.map(g => g.name), push: gsi.push } as any);
    });
    sdm.addGoalExecutionListener(async gci => {
        switch (gci.goalEvent.state) {
            case SdmGoalState.requested:
            case SdmGoalState.in_process:
                return gci.addressChannels(`${pushIdentification(gci.goalEvent.push)}
${chalk.yellow(`︎▸ ${goalIndentification(gci.goalEvent)}`)} ${gci.goalEvent.description}`);
            case SdmGoalState.skipped:
                return gci.addressChannels(`${pushIdentification(gci.goalEvent.push)}
${chalk.yellow(`॥ ${goalIndentification(gci.goalEvent)}`)} ${gci.goalEvent.description}`);
            default:
                break;
        }
    });
}

function addShowReviewResults(sdm: SoftwareDeliveryMachine) {
    sdm.addReviewListenerRegistration({
        name: "consoleListener",
        listener: async l => {
            await l.addressChannels(`${l.review.comments.length} review comments`);
            for (const c of l.review.comments) {
                await l.addressChannels(renderReviewComment(c));
            }
        },
    });
}

function renderReviewComment(rc: ReviewComment) {
    let s = "";
    switch (rc.severity) {
        case "error":
            s += "✘ " + chalk.red(rc.severity);
            break;
        case "warn":
            s += "⚠︎ " + chalk.yellow(rc.severity);
            break;
        case "info":
            s += "☞ " + chalk.cyan(rc.severity);
            break;
    }
    return `${s}: ${rc.category} - ${rc.detail} ${JSON.stringify(rc.sourceLocation)}`;
}
