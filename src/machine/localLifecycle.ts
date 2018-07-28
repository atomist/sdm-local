import { BuildStatus, ExtensionPack, OnPushToAnyBranch, SdmGoalState, SoftwareDeliveryMachine } from "@atomist/sdm";
import { BuildStatusUpdater } from "@atomist/sdm-core/internal/delivery/build/local/LocalBuilder";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { HttpBuildStatusUpdater } from "../binding/HttpBuildStatusUpdater";
import { DefaultAutomationClientConnectionConfig } from "../entry/resolveConnectionConfig";
import { isLocal } from "./isLocal";

import chalk from "chalk";
import Push = OnPushToAnyBranch.Push;

/**
 * Add Local IO to the given SDM.
 * Analogous to Slack lifecycle.
 * Messages will be formatted for console output.
 */
export const LocalLifecycle: ExtensionPack = {
    ...metadata(),
    configure: sdm => {
        if (isLocal()) {
            addLocalLifecycle(sdm);
            const bu = sdm as any as BuildStatusUpdater;
            const buu = new HttpBuildStatusUpdater(DefaultAutomationClientConnectionConfig);
            bu.updateBuildStatus = buu.updateBuildStatus.bind(buu);
        }
    },
};

/**
 * Formatted for the console
 * @param {SoftwareDeliveryMachine} sdm
 */
function addLocalLifecycle(sdm: SoftwareDeliveryMachine) {
    sdm.addPushImpactListener(async pu => {
        return pu.addressChannels(`Push to \`${pu.id.owner}:${pu.id.repo}\` - _${pu.commit.message}_`);
    });
    sdm.addGoalsSetListener(async gsi => {
        return gsi.addressChannels(
            chalk.yellow(`▶ Goals for ${gsi.push.commits[0].sha} on branch ${gsi.push.branch}: ${
                gsi.goalSet.goals.map(g => chalk.italic(g.name)).join(" ⏦ ")}\n`) +
            `\t${chalk.italic(gsi.push.commits[0].message)}\n`);
    });
    sdm.addGoalExecutionListener(async gci => {
        switch (gci.goalEvent.state) {
            case SdmGoalState.success:
                return gci.addressChannels(chalk.green(`✔ ${gci.goalEvent.description} ${onWhat(gci.goalEvent.push)}\n`));
            case SdmGoalState.failure:
                return gci.addressChannels(chalk.red(`✖︎︎ ${gci.goalEvent.description} ${onWhat(gci.goalEvent.push)}\n`));
            // case SdmGoalState.requested:
            //     return gci.addressChannels(chalk.red(`✖︎︎ ${gci.goalEvent.description}\n`));
            // waiting_for_approval = "waiting_for_approval",
            // planned = "planned",
            case SdmGoalState.in_process:
                return gci.addressChannels(chalk.yellow(`⚙︎ ${gci.goalEvent.description} ${onWhat(gci.goalEvent.push)}\n`));
            case SdmGoalState.skipped:
                return gci.addressChannels(chalk.yellow(`?︎ ${gci.goalEvent.description} ${onWhat(gci.goalEvent.push)}\n`));
            default:
                break;
        }
    });
    sdm.addBuildListener(async bu => {
        return bu.addressChannels(`${buildStatusEmoji(bu.build.status)} Build status is \`${bu.build.status}\` ${onWhat(bu.build.push)}`);
    });
    sdm.addDeploymentListener(async li => {
        return li.addressChannels(`Successful deployment of ${li.id.url} at ${li.status.targetUrl}`);
    });
}

function onWhat(push: Push): string {
    const commit = push.commits[0];
    return `on _${commit.sha}_`;
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
