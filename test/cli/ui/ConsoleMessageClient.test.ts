import { Attachment } from "@atomist/slack-messages";
import * as assert from "assert";
import { ConsoleMessageClient } from "./../../../src/sdm/ui/ConsoleMessageClient";

describe("message formatting", () => {
    it("doesn't freeze on this dangerous string", async () => {

        // This attachment once caused the printing programs to freeze forever.
        // 3s for 12
        // 10s for 13
        // 50s for 14
        // 16 never returns within our span of patiences
        const suspiciousAttachment: Attachment = {
            author_name: "Commands",
            fallback: "Commands",
            // tslint:disable:max-line-length
            text: "*Conflicter1* `eat breakfast` Conflicter1\n" +
                "*Conflicter2* `eat breakfast` Conflicter2\n" +
                "*ExportMoreThingsTransform* `export more things` ExportMoreThingsTransform\n"
                + "*GenerateSdmPack* `create pack` GenerateSdmPack\n"
                + "*hellojess* `hello jess-sdm` hellojess\n"
                + "*List identifiers imported from @atomist/automation-client* `list imports from automation-client` List identifiers imported from @atomist/automation-client\n"
                + "*List identifiers imported from @atomist/sdm-local* `list imports from sdm-local` List identifiers imported from @atomist/sdm-local\n"
                + "*List projects* `tell me everything` List projects\n"
                + "*RenameSdmGoal* `rename RunWithLogContext` RenameSdmGoal\n"
                + "*ResetGoalsOnCommit* `plan goals atomist/jess-sdm`, `plan goals`, `reset goals atomist/jess-sdm`, `reset goals` Set goals\n"
                + "*SelfDescribe* `describe sdm atomist/jess-sdm`, `describe sdm` Describe this SDM\n"
                + "*SetGoalState* `set goal state atomist/jess-sdm`, `set goal state` Set state of a particular goal\n"
                + "*UpdateLatestVersionsHere* `update your sdm versions` UpdateLatestVersionsHere\n"
                + "*UpgradeSdmToBreakOutApi* `break out api` Upgrade @atomist/sdm to 0.3, including the split into @atomist/sdm and @atomist/sdm-core\n"
                + "*UpgradeToLatestSdmOnly* `bump sdm versions` Upgrade @atomist/sdm and its friends. Dependency upgrade only\n"
                + "*WhereAmI* `where am I` WhereAmI",
            footer: "@atomist/jess-sdm:0.1.2\n",
        };

        let output = "";
        const subject = new ConsoleMessageClient("general", async s => { output = output + s; }, {} as any);

        await subject.addressChannels({ text: "I am safe", attachments: [suspiciousAttachment] }, "general");
        assert(output.includes("WhereAmI"), "It's OK if it didn't render it in markdown, but it should display the whole attachment");
    });
});
