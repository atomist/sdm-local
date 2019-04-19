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

import { HandlerResult, RepoId } from "@atomist/automation-client";
import { OnRepoCreation } from "@atomist/sdm";
import {
    OnChannelLink,
    OnRepoOnboarded,
} from "@atomist/sdm-core";
import { repoFieldsFromProject } from "../../../common/git/pushFromLastCommit";
import { EventSender } from "../../../common/invocation/EventHandlerInvocation";
import { LocalWorkspaceContext } from "../../../common/invocation/LocalWorkspaceContext";

export async function sendRepoCreationEvent(
    cc: LocalWorkspaceContext,
    id: RepoId,
    eventSender: EventSender): Promise<HandlerResult> {
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

export async function sendChannelLinkEvent(
    cc: LocalWorkspaceContext,
    id: RepoId,
    eventSender: EventSender): Promise<HandlerResult> {
    const repo = repoFieldsFromProject(cc.workspaceId, id);
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

export async function sendRepoOnboardingEvent(
    cc: LocalWorkspaceContext,
    id: RepoId,
    eventSender: EventSender): Promise<HandlerResult> {
    const payload: OnRepoOnboarded.Subscription = {
        RepoOnboarded: [{
            repo: repoFieldsFromProject(cc.workspaceId, id),
        }],
    };
    return eventSender({
        name: "OnRepoOnboarded",
        payload,
    });
}
