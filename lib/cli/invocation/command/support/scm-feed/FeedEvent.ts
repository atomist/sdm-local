/**
 * Modeled on GitHub activity feed, but not SCM specific
 */
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

// TODO how many events do we get?

/**
 * Typically used in creating a FeedEventReader
 */
export interface ScmFeedCriteria {
    readonly token: string;
    readonly scheme?: string;
    readonly apiBase?: string;
    readonly owner: string;
    readonly user?: boolean;
}

export interface FeedEventReader {

    /**
     * Window of events we've seen, to allow deduping
     */
    readonly eventWindow: FeedEvent[];

    /**
     * Get all the latest feed events.
     * The implementation is responsible for not delivering
     * events already seen.
     * @return {Promise<FeedEvent[]>}
     */
    readNewEvents(): Promise<FeedEvent[]>;

}
