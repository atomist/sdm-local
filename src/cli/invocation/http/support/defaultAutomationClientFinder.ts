import { AutomationClientFinder } from "../AutomationClientFinder";
import { PortRangeAutomationClientFinder } from "./PortRangeAutomationClientFinder";
import { DefaultSdmCdPort } from "../../command/addStartSdmDeliveryMachine";

export function defaultAutomationClientFinder(): AutomationClientFinder {
    return new PortRangeAutomationClientFinder({
        additionalPorts: [DefaultSdmCdPort],
    });
}