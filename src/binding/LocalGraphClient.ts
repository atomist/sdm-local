import { logger } from "@atomist/automation-client";
import { GraphClient, MutationOptions, QueryOptions } from "@atomist/automation-client/spi/graph/GraphClient";
import { writeToConsole } from "../invocation/cli/support/consoleOutput";

export class LocalGraphClient implements GraphClient {

    public endpoint: string;

    public executeMutation<T, Q>(mutation: string, variables?: Q, options?: any): Promise<any> {
        throw new Error();
    }

    public executeMutationFromFile<T, Q>(path: string, variables?: Q, options?: any, current?: string): Promise<T> {
        throw new Error();
    }

    public async executeQuery<T, Q>(query: string, variables?: Q, options?: any): Promise<T> {
        writeToConsole({ message: "Returning empty object for query " + query, color: "red" });
        return {} as T;
    }

    public executeQueryFromFile<T, Q>(path: string, variables?: Q, options?: any, current?: string): Promise<T> {
        throw new Error();
    }

    public mutate<T, Q>(optionsOrName: MutationOptions<Q> | string): Promise<T> {
        throw new Error();
    }

    public async query<T, Q>(optionsOrName: QueryOptions<Q> | string): Promise<T> {
        const err = new Error("Warning: GraphClient not supported locally");
        logger.warn("Returning empty object for query: %j, %s", optionsOrName, err.stack);
        return {} as T;
    }

    constructor() {
        const err = new Error("Warning: GraphClient not supported locally");
        logger.warn(err.stack);
    }

}
