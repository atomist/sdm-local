import { BuildStatus, ExtensionPack, SdmGoalState, SoftwareDeliveryMachine } from "@atomist/sdm";
import { BuildStatusUpdater } from "@atomist/sdm-core/internal/delivery/build/local/LocalBuilder";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { HttpBuildStatusUpdater } from "../binding/HttpBuildStatusUpdater";
import { DefaultAutomationClientConnectionConfig } from "../entry/resolveConnectionConfig";
import { isLocal } from "./isLocal";

import chalk from "chalk";

/**
 * Add Local IO to the given SDM.
 * Analogous to Slack lifecycle.
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
            chalk.yellow(`▶ Goals for ${gsi.push.commits[0].sha}: ${gsi.goalSet.goals.map(g => chalk.italic(g.name)).join(" ⏦ ")}\n`) +
            `\t${chalk.italic(gsi.push.commits[0].message)}\n`);
    });
    sdm.addGoalCompletionListener(async gci => {
        switch (gci.completedGoal.state) {
            case SdmGoalState.success:
                return gci.addressChannels(chalk.green(`✔ ${gci.completedGoal.description}\n`));
            case SdmGoalState.requested:
                return gci.addressChannels(chalk.red(`✖︎︎ ${gci.completedGoal.description}\n`));
            //waiting_for_approval = "waiting_for_approval",
            //failure = "failure",
            // planned = "planned",
            case SdmGoalState.in_process:
                return gci.addressChannels(chalk.yellow(`⚙︎ ${gci.completedGoal.description}\n`));
            //skipped = "skipped"
            default:
                break;
        }
    });
    sdm.addBuildListener(async bu => {
        return bu.addressChannels(`Build status is \`${bu.build.status}\` ${buildStatusEmoji(bu.build.status)}`);
    });
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
