import { RepoId } from "@atomist/automation-client/operations/common/RepoId";
import { OnRepoCreation } from "@atomist/sdm";
import {
    CoreRepoFieldsAndChannels,
    OnChannelLink,
    OnRepoOnboarded,
} from "@atomist/sdm-core/typings/types";
import { AutomationClientConnectionConfig } from "../../invocation/http/AutomationClientConnectionConfig";
import { invokeEventHandler } from "../../invocation/http/EventHandlerInvocation";
import { repoFieldsFromProject } from "./pushFromLastCommit";

export async function sendRepoCreationEvent(cc: AutomationClientConnectionConfig, id: RepoId) {
    const payload: OnRepoCreation.Subscription = {
        Repo: [{
            owner: id.owner,
            name: id.repo,
            id: `${id.owner}/${id.repo}`,
        }],
    };
    return invokeEventHandler(cc, {
        name: "OnRepoCreation",
        payload,
    });
}

export async function sendChannelLinkEvent(cc: AutomationClientConnectionConfig, id: RepoId) {
    const repo = repoFieldsFromProject(cc.atomistTeamId, id) as CoreRepoFieldsAndChannels.Fragment;
    const payload: OnChannelLink.Subscription = {
        ChannelLink: [{
            repo,
            channel: repo.channels[0],
        }],
    };
    return invokeEventHandler(cc, {
        name: "OnChannelLink",
        payload,
    });
}

export async function sendRepoOnboardingEvent(cc: AutomationClientConnectionConfig, id: RepoId) {
    const payload: OnRepoOnboarded.Subscription = {
        RepoOnboarded: [{
            repo: repoFieldsFromProject(cc.atomistTeamId, id) as CoreRepoFieldsAndChannels.Fragment,
        }],
    };
    return invokeEventHandler(cc, {
        name: "OnRepoOnboarded",
        payload,
    });
}
