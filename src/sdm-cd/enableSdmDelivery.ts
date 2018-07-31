import { SoftwareDeliveryMachine, whenPushSatisfies, Goals } from "@atomist/sdm";
import { SdmDeliveryGoal, executeSdmDelivery, IsSdm } from "./SdmDeliveryGoal";
import { IsLocal } from "../pushtest/isLocal";

/**
 * Call this before anything else
 * @param {SoftwareDeliveryMachine} sdm
 */
export function enableSdmDelivery(sdm: SoftwareDeliveryMachine) {
    sdm.addGoalImplementation("SDM CD", SdmDeliveryGoal,
        executeSdmDelivery(sdm.configuration.sdm.projectLoader, {}));
    sdm.addGoalContributions(
        whenPushSatisfies(IsSdm, IsLocal).setGoals(
            new Goals("delivery", SdmDeliveryGoal).andSeal()));
}