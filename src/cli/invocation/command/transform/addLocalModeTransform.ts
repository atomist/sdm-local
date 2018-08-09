import { CodeTransformRegistration } from "@atomist/sdm";
import { addDependencyTransform } from "./addDependencyTransform";

/**
 * Transform to add local mode into a project
 */
export const AddLocalMode: CodeTransformRegistration<{ version: string }> = {
    ...addDependencyTransform("@atomist/sdm-local") as any,
    name: "addLocalMode",
    intent: "add local mode",
};