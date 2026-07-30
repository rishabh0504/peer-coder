import boxen from "boxen";
import picocolors from "picocolors";

export interface RenderWorkspaceData {
  workspaceContext?: {
    projectName?: string;
    languages?: string[];
    frameworks?: string[];
    packageManager?: string;
    testFrameworks?: string[];
    runtimes?: string[];
    importantFiles?: string[];
  };
  summary?: string;
  status: string;
}

export function renderWorkspaceResult(data: RenderWorkspaceData): void {
  const ctx = data.workspaceContext;
  if (!ctx) {
    console.log(picocolors.yellow("\n⚠️  No workspace context returned from analysis.\n"));
    return;
  }

  const lines = [
    `${picocolors.bold(picocolors.blue("📁 Project:"))}      ${ctx.projectName || "Unknown"}`,
    `${picocolors.bold(picocolors.blue("🗂  Languages:"))}    ${ctx.languages?.join(", ") || "None detected"}`,
    `${picocolors.bold(picocolors.blue("🧱 Frameworks:"))}   ${ctx.frameworks?.join(", ") || "None detected"}`,
    `${picocolors.bold(picocolors.blue("📦 Package Mgr:"))}  ${ctx.packageManager || "None detected"}`,
    `${picocolors.bold(picocolors.blue("🧪 Testing:"))}      ${ctx.testFrameworks?.join(", ") || "None detected"}`,
    `${picocolors.bold(picocolors.blue("⚙️  Runtimes:"))}     ${ctx.runtimes?.join(", ") || "None detected"}`,
  ];

  console.log(
    boxen(lines.join("\n"), {
      title: "🔍 Workspace Intelligence Report",
      titleAlignment: "center",
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
    }),
  );

  if (data.summary) {
    console.log(picocolors.bold(picocolors.magenta("\n📝 Project Architecture Summary:")));
    console.log(picocolors.white(data.summary));
    console.log();
  }
}
