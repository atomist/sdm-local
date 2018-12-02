import { authHeaders } from "@atomist/sdm-core/lib/util/github/ghub";
import axios from "axios";

// TODO how many events do we get?

export interface FeedCriteria {
    token: string;
    scheme?: string;
    apiBase?: string;
    owner: string;
    user?: boolean;
}

/**
 * Read the GitHubActivityFeed
 * @return {Promise<void>}
 */
export async function readGitHubActivityFeed(how: FeedCriteria): Promise<FeedEvent[]> {
    // TODO how many events do you get
    const config = authHeaders(how.token);
    const url = `${how.scheme || "https://"}${how.apiBase || "api.github.com"}/${!!how.user ? "users" : "orgs"}/${how.owner}/events`;
    // TODO why do we need this cast?
    const r = await axios.get(url, config as any);
    return r.data;
}

export interface FeedEvent {
    type: "PushEvent" | string;
    id: string;
}

/**
 * Repo name is of format org/name
 */
export interface PushEvent extends FeedEvent {

    type: "PushEvent";

    actor: {
        login: string;
    };

    repo: {
        name: string;
    };
}

export function isPushEvent(a: any): a is PushEvent {
    const maybe = a as PushEvent;
    return maybe.type === "PushEvent";
}
