
const ClientType = "slalom";

/**
 * Create a correctly formatted correlation ID. We encode the port that
 * the automation client's message client can communicate back to us on over HTTP,
 * and the channel to use to display messages.
 * @return {string}
 */
export function newCorrelationId(channel: string = "general"): string {
    return `${ClientType}-${pidToPort(process.pid)}-${channel}-${new Date().getTime()}`;
}

export function clientIdentifier(correlationId: string): number {
    const pattern = new RegExp(`^${ClientType}\-([^\-]+)\-`);
    const id = correlationId.match(pattern)[1];
    return parseInt(id, 10);
}

export function channelFor(correlationId: string): string {
    const pattern = new RegExp(`^${ClientType}\-[^\-]+\-([^\-]+)`);
    const channel = correlationId.match(pattern)[1];
    return channel;
}

export function pidToPort(pid: number): number {
    return pid % 55536 + 10000;
}
