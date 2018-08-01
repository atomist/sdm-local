import { AutomationClientFinder } from "../AutomationClientFinder";

export interface PortRangeOptions {
    lowerPort: number;
    checkRange: number;
}

export class PortRangeAutomationClientFinder implements AutomationClientFinder {

    private readonly options: PortRangeOptions;

    public async findAutomationClientUrls(): Promise<string[]> {
        return [];
    }

    constructor(opts: Partial<PortRangeOptions>) {
        this.options = {
            lowerPort: 2866,
            checkRange: 10,
            ...opts,
        }
    }

}