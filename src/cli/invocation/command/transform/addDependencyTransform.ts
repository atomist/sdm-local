import { CodeTransformRegistration } from "@atomist/sdm";
import { localCommandsCodeTransform } from "@atomist/sdm/api-helper/command/transform/localCommandsCodeTransform";
import { asSpawnCommand } from "@atomist/automation-client/util/spawned";

export interface ModuleId {
    name?: string;
    version: string;
}

/**
 * Transform to add a module to a project. Uses npm install.
 */
export function addDependencyTransform(name?: string): Partial<CodeTransformRegistration<ModuleId>> {
    return {
        parameters: {
            name: {
                required: !name,
                description: "module name",
            },
            version: {
                required: false,
                description: "npm version qualification. Goes after module name, e.g. @branch-master",
                defaultValue: "",
            },
        },
        transform: async (p, cli) => {
            const command = asSpawnCommand(`npm i ${cli.parameters.name || name}${cli.parameters.version}`);
            return localCommandsCodeTransform([command])(p, cli);
        },
    };
}