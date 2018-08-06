import { TeamContextResolver } from "./TeamContextResolver";
import { warningMessage } from "../../cli/invocation/command/support/consoleOutput";
import * as os from "os";

const DefaultTeamId = "T123";

/**
 * Resolve team from the environment, within CLI
 */
export class EnvironmentTeamContextResolver implements TeamContextResolver {

    public get atomistTeamId(): string {
        const teams = process.env.ATOMIST_TEAMS;
        if (!!teams) {
            return teams.split(",")[0];
        }
        warningMessage("ATOMIST_TEAMS environment variable not set: Using default of %s", DefaultTeamId);
        return DefaultTeamId;
    }

    public get atomistTeamName(): string {
        return os.hostname();
    }

}