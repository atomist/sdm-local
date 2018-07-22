
const ClientType = "slalom";

/**
 * Create a correctly formatted correlation ID for this
 * @return {string}
 */
export function newCorrelationId(): string {
    return `${ClientType}-${process.pid}-${new Date().getTime()}`;
}

export function clientIdentifier(correlationId: string): string {
    const pattern = new RegExp(`^${ClientType}\-([^\-]+)\-`);
    const id = correlationId.match(pattern)[1];
    process.stdout.write(`Pclient ideentifier from '${correlationId}' is '${id}'`);
    return id;
}
