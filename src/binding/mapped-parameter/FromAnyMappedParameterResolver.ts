import { MappedParameterDeclaration } from "@atomist/automation-client/metadata/automationMetadata";
import { MappedParameterResolver } from "./MappedParameterResolver";

/**
 * MappedParameterResolver that uses many delegates and returns the
 * first resolution
 */
export class FromAnyMappedParameterResolver {

    private readonly delegates: MappedParameterResolver[];

    public resolve(md: MappedParameterDeclaration): string | undefined {
        const resolutions = this.delegates.map(d => d.resolve(md));
        return resolutions.find(r => !!r);
    }

    constructor(...delegates: MappedParameterResolver[]) {
        this.delegates = delegates;
    }
}
