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
    ExtensionPack,
    metadata,
    OnPushToAnyBranch,
    SdmGoalEvent,
    SdmGoalState,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { isInLocalMode } from "@atomist/sdm-core";
import chalk from "chalk";
import * as _ from "lodash";
import { isFileSystemRemoteRepoRef } from "../binding/project/FileSystemRemoteRepoRef";
import Push = OnPushToAnyBranch.Push;

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
        }
    },
};

function addShowCreatedLocalRepo(sdm: SoftwareDeliveryMachine): void {
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
function addLocalLifecycle(sdm: SoftwareDeliveryMachine): void {
    sdm.addGoalCompletionListener(async gcl => {
        switch (gcl.completedGoal.state) {
            case SdmGoalState.success:
                return gcl.addressChannels(`${pushIdentification(gcl.completedGoal.push)}
${chalk.green(`✓ ${goalIndentification(gcl.completedGoal)}`)} ${gcl.completedGoal.description}${links(gcl.completedGoal)}`);
            case SdmGoalState.stopped:
                return gcl.addressChannels(`${pushIdentification(gcl.completedGoal.push)}
${chalk.yellow(`▪ ${goalIndentification(gcl.completedGoal)}`)} ${gcl.completedGoal.description}${links(gcl.completedGoal)}`);
            case SdmGoalState.canceled:
                return gcl.addressChannels(`${pushIdentification(gcl.completedGoal.push)}
${chalk.gray(`⁃ ${goalIndentification(gcl.completedGoal)}`)} ${gcl.completedGoal.description}${links(gcl.completedGoal)}`);
            case SdmGoalState.skipped:
                return gcl.addressChannels(`${pushIdentification(gcl.completedGoal.push)}
${chalk.gray(`⬩ ${goalIndentification(gcl.completedGoal)}`)} ${gcl.completedGoal.description}${links(gcl.completedGoal)}`);
            case SdmGoalState.failure:
                return gcl.addressChannels(`${pushIdentification(gcl.completedGoal.push)}
${chalk.red(`⨯ ${goalIndentification(gcl.completedGoal)}`)} ${gcl.completedGoal.description}${
                    gcl.completedGoal.url ? `${linkIndicator()} ${chalk.grey(gcl.completedGoal.url)}` : ""}${links(gcl.completedGoal)}`);
        }
    });
    sdm.addGoalsSetListener(async gsi => {
        const msg = pushIdentification(gsi.push) + (!gsi.goalSet ? "\nNo goals" : `
▸ Goals
${gsi.goalSet.goals.map(g => `⏦ ${chalk.italic(goalIndentification(g as any))}`).join("\n")}`);
        await gsi.addressChannels(msg);
        return gsi.addressChannels({
            goalSetId: gsi.goalSetId,
            goals: !gsi.goalSet ? [] : gsi.goalSet.goals.map(g => g.name),
            push: gsi.push,
        } as any);
    });
    sdm.addGoalExecutionListener(async gci => {
        switch (gci.goalEvent.state) {
            case SdmGoalState.requested:
                return gci.addressChannels(`${pushIdentification(gci.goalEvent.push)}
${chalk.yellow(`︎▹ ${goalIndentification(gci.goalEvent)}`)} ${gci.goalEvent.description}`);
            case SdmGoalState.in_process:
                return gci.addressChannels(`${pushIdentification(gci.goalEvent.push)}
${chalk.yellow(`︎▸ ${goalIndentification(gci.goalEvent)}`)} ${gci.goalEvent.description}`);
            default:
                break;
        }
    });
}

function links(sdmGoal: SdmGoalEvent): string {
    return sdmGoal.externalUrls && sdmGoal.externalUrls.length > 0 ? `${
        linkIndicator()} ${chalk.grey(sdmGoal.externalUrls.map(u => u.url).join(" "))}` : "";
}
