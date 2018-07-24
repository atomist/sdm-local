
const ClientType = "slalom";

/**
 * Create a correctly formatted correlation ID for this
 * @return {string}
 */
export function newCorrelationId(): string {
    return `${ClientType}-${process.pid}-${new Date().getTime()}`;
}

export function clientIdentifier(correlationId: string): number {
    const pattern = new RegExp(`^${ClientType}\-([^\-]+)\-`);
    const id = correlationId.match(pattern)[1];
    return parseInt(id, 10);
}
