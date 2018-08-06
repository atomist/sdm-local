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

import * as os from "os";
import { warningMessage } from "../../cli/invocation/command/support/consoleOutput";
import { LocalTeamContext } from "../LocalTeamContext";
import { TeamContextResolver } from "./TeamContextResolver";

const DefaultTeamId = "T123";

/**
 * Resolve team from the environment, within CLI
 */
export class EnvironmentTeamContextResolver implements TeamContextResolver {

    public get teamContext(): LocalTeamContext {
        let atomistTeamId: string;
        const teams = process.env.ATOMIST_TEAMS;
        if (!!teams) {
            atomistTeamId = teams.split(",")[0];
        } else {
            warningMessage("ATOMIST_TEAMS environment variable not set: Using default of %s", DefaultTeamId);
            atomistTeamId = DefaultTeamId;
        }
        return {
            atomistTeamId,
            atomistTeamName: os.hostname(),
        };
    }

}
