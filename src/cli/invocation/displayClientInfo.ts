import { AutomationClientInfo } from "../AutomationClientInfo";
import chalk from "chalk";

/**
 * Format information about this automation for the console
 * @param {AutomationClientInfo} aci
 * @return {string}
 */
export function displayClientInfo(aci: AutomationClientInfo): string {
    const local = aci.localConfig ? aci.localConfig.repositoryOwnerParentDirectory : "(remote)";
    return `${chalk.bold(aci.client.name)} @ ${chalk.underline(aci.connectionConfig.baseEndpoint)} - ${local}`;
}