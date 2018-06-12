
/**
 * Base directory of this SDM. Used in installing hooks
 * @return {string}
 */
export function sdmBaseDirectory(): string {
    // We want the base directory, not our path.
    // Warning: Won't survive refactoring.
    return __dirname.replace("/build/src/machine", "");
}
