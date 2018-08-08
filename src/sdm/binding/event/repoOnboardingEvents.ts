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

import { RepoId } from "@atomist/automation-client/operations/common/RepoId";
import { OnRepoCreation } from "@atomist/sdm";
import { CoreRepoFieldsAndChannels, OnChannelLink, OnRepoOnboarded, } from "@atomist/sdm-core/typings/types";
import { EventSender } from "../../../common/EventHandlerInvocation";
import { LocalTeamContext } from "../../../common/LocalTeamContext";
import { repoFieldsFromProject } from "./pushFromLastCommit";

export async function sendRepoCreationEvent(cc: LocalTeamContext, id: RepoId, eventSender: EventSender) {
    const payload: OnRepoCreation.Subscription = {
        Repo: [{
            owner: id.owner,
            name: id.repo,
            id: `${id.owner}/${id.repo}`,
        }],
    };
    return eventSender({
        name: "OnRepoCreation",
        payload,
    });
}

export async function sendChannelLinkEvent(cc: LocalTeamContext, id: RepoId, eventSender: EventSender) {
    const repo = repoFieldsFromProject(cc.atomistTeamId, id) as CoreRepoFieldsAndChannels.Fragment;
    const payload: OnChannelLink.Subscription = {
        ChannelLink: [{
            repo,
            channel: repo.channels[0],
        }],
    };
    return eventSender({
        name: "OnChannelLink",
        payload,
    });
}

export async function sendRepoOnboardingEvent(cc: LocalTeamContext, id: RepoId, eventSender: EventSender) {
    const payload: OnRepoOnboarded.Subscription = {
        RepoOnboarded: [{
            repo: repoFieldsFromProject(cc.atomistTeamId, id) as CoreRepoFieldsAndChannels.Fragment,
        }],
    };
    return eventSender({
        name: "OnRepoOnboarded",
        payload,
    });
}
