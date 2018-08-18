import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";

export function renderCommandHandlerForm(parameters: any,
                                         command: CommandHandlerMetadata): string {
    return `
<html>
    <body>

        <h3>${command.name}</h3>
        <h4>${command.description ? command.description : ""}</h4>

        <form action="/command/${command.name}" method="post">
            <table>
            ${command.parameters.filter(p => p.displayable).map(p => {
                return `<tr><td>${p.display_name}${p.required ? "*" : ""}:</td><td>
                    <input type="text" name="${p.name}" value="${ parameters[p.name] ? parameters[p.name] : 
                    (p.default_value ? p.default_value : "") }" />
                    <br/>${p.description ? p.description : ""}</td></tr>`;
            }).join("\n")}
            </table>
            <input type="submit" value="Run">
        </form>

    </body>
</html>`;
}
