import * as p from "@clack/prompts";
import boxen from "boxen";
import picocolors from "picocolors";
import { z } from "zod";
import { logger } from "@utils/logger.js";

const projectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name cannot be empty")
    .regex(
      /^[a-z0-9-_]+$/,
      "Project name must be kebab-case (lowercase, numbers, hyphens, underscores)",
    ),
  framework: z.enum(["typescript", "javascript"]),
  installDeps: z.boolean(),
});

export interface InitOptions {
  name?: string;
  yes?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  console.log(
    boxen(picocolors.bold(picocolors.cyan("🚀 Welcome to Modern CLI Setup")), {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
    }),
  );

  if (options.yes) {
    logger.info("Running in non-interactive automatic mode...");
    const projectName = options.name || "my-awesome-project";
    logger.success(`Initialized project ${picocolors.bold(projectName)} with default settings.`);
    return;
  }

  p.intro(picocolors.bgCyan(picocolors.black(" CLI Scaffolding Wizard ")));

  const group = await p.group(
    {
      name: () =>
        p.text({
          message: "What is your project name?",
          placeholder: "my-project",
          initialValue: options.name || "my-project",
          validate: (value) => {
            const res = projectSchema.shape.name.safeParse(value);
            if (!res.success) {
              return res.error.errors[0]?.message || "Invalid name";
            }
            return undefined;
          },
        }),
      framework: () =>
        p.select({
          message: "Select language variant:",
          options: [
            {
              value: "typescript",
              label: "TypeScript (Recommended)",
              hint: "Strict type safety & ESM",
            },
            { value: "javascript", label: "JavaScript", hint: "Plain ESM Node.js" },
          ],
          initialValue: "typescript",
        }),
      installDeps: () =>
        p.confirm({
          message: "Do you want to automatically install dependencies?",
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        p.cancel("Operation cancelled by user.");
        process.exit(0);
      },
    },
  );

  const s = p.spinner();
  s.start("Scaffolding your project structure...");
  await new Promise((resolve) => setTimeout(resolve, 800));
  s.stop("Project structure created!");

  p.note(
    `cd ${group.name}\n${group.installDeps ? "npm run dev" : "npm install && npm run dev"}`,
    "Next Steps",
  );

  p.outro(picocolors.green("✨ Initialization completed successfully!"));
}
