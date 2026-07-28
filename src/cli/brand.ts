import os from "node:os";
import figlet from "figlet";
import gradient from "gradient-string";
import picocolors from "picocolors";

export function printBrandBanner(): void {
    const cwd = process.cwd().replace(os.homedir(), "~");

    const asciiText = figlet.textSync("PEER CODER", {
        font: "ANSI Shadow",
        horizontalLayout: "default",
        verticalLayout: "default",
    });

    const coloredBanner = gradient.pastel.multiline(asciiText);

    console.log();
    console.log(coloredBanner);
    console.log(
        `  ${picocolors.bold("�‍💻 PEER-CODER CLI")} ${picocolors.dim("v1.0.0")} ${picocolors.gray("— Autonomous AI Coding Partner")}`,
    );
    console.log(`  ${picocolors.dim("📍 " + cwd)}`);
    console.log();
    console.log(
        `  ${picocolors.dim("Type a prompt or press")} ${picocolors.bold("Tab")} ${picocolors.dim("for commands (/info, /help, /clear, /exit).")}`,
    );
    console.log();
}
