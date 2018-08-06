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
    BuildStatus,
    ExtensionPack,
    OnPushToAnyBranch,
    SdmGoalState,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { BuildStatusUpdater } from "@atomist/sdm-core/internal/delivery/build/local/LocalBuilder";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import chalk from "chalk";
import { DefaultAutomationClientConnectionConfig } from "../../cli/entry/resolveConnectionConfig";
import { isInLocalMode } from "@atomist/sdm-core";
import { HttpBuildStatusUpdater } from "../binding/HttpBuildStatusUpdater";
import Push = OnPushToAnyBranch.Push;

/**
 * Add Local IO to the given SDM.
 * Analogous to Slack lifecycle.
 * Messages will be formatted for console output.
 */
export const LocalLifecycle: ExtensionPack = {
    ...metadata(),
    configure: sdm => {
        if (isInLocalMode()) {
            addLocalLifecycle(sdm);
            const bu = sdm as any as BuildStatusUpdater;
            const buu = new HttpBuildStatusUpdater(DefaultAutomationClientConnectionConfig);
            bu.updateBuildStatus = buu.updateBuildStatus.bind(buu);
        }
    },
};

function pushIdentification(pu: Push) {
    let msg = pu.commits[0].message;
    if (msg.length > 50) {
        msg = msg.slice(0, 47) + "...";
    }
    return `\`${pu.repo.owner}/${pu.repo.name}/${pu.branch}\` _${msg}_ \`[${pu.commits[0].sha.slice(0, 7)}]\``;
}

/**
 * Formatted for the console
 * @param {SoftwareDeliveryMachine} sdm
 */
function addLocalLifecycle(sdm: SoftwareDeliveryMachine) {
    sdm.addPushImpactListener(async pu => {
        return pu.addressChannels(`Push to ${pushIdentification(pu.push)}`);
    });
    sdm.addGoalsSetListener(async gsi => {
        const msg = `${pushIdentification(gsi.push)}
\t▶ Goals
\t${gsi.goalSet.goals.map(g => `⏦ ${chalk.italic(g.name)}`).join("\n\t")}`;
        return gsi.addressChannels(msg);
    });
    sdm.addGoalExecutionListener(async gci => {
        switch (gci.goalEvent.state) {
            case SdmGoalState.success:
                return gci.addressChannels(`${pushIdentification(gci.goalEvent.push)}
\t${chalk.green(`✔ ${gci.goalEvent.description}`)}`);
            case SdmGoalState.failure:
                return gci.addressChannels(`${pushIdentification(gci.goalEvent.push)}
\t${chalk.red(`✖︎︎ ${gci.goalEvent.description}`)}`);
            // case SdmGoalState.requested:
            //     return gci.addressChannels(chalk.red(`✖︎︎ ${gci.goalEvent.description}\n`));
            // waiting_for_approval = "waiting_for_approval",
            // planned = "planned",
            case SdmGoalState.in_process:
                return gci.addressChannels(`${pushIdentification(gci.goalEvent.push)}
\t${chalk.yellow(`⚙︎ ${gci.goalEvent.description}`)}`);
            case SdmGoalState.skipped:
                return gci.addressChannels(`${pushIdentification(gci.goalEvent.push)}
\t${chalk.yellow(`?︎ ${gci.goalEvent.description}`)}`);
            default:
                break;
        }
    });
    // sdm.addBuildListener(async bu => {
    //     return bu.addressChannels(`${buildStatusEmoji(bu.build.status)} Build status is \`${bu.build.status}\` ${onWhat(bu.build.push)}`);
    // });
    // sdm.addDeploymentListener(async li => {
    //     return li.addressChannels(`Successful deployment at ${li.status.targetUrl} of ${}`);
    // });
}

function buildStatusEmoji(status: BuildStatus): string {
    switch (status) {
        case BuildStatus.passed :
            return ":tada:";
        case BuildStatus.started:
            return "";
        default:
            return "";
    }
}
