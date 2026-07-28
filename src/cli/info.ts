import os from "node:os";
import boxen from "boxen";
import picocolors from "picocolors";
import { loadEnv } from "@config/env.js";

export function infoCommand(): void {
  const env = loadEnv();
  const infoText = [
    `${picocolors.bold("OS:")} ${os.type()} ${os.release()} (${os.arch()})`,
    `${picocolors.bold("Node.js:")} ${process.version}`,
    `${picocolors.bold("Environment:")} ${env.NODE_ENV}`,
    `${picocolors.bold("Log Level:")} ${env.LOG_LEVEL}`,
    `${picocolors.bold("System Memory:")} ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    `${picocolors.bold("CPU Cores:")} ${os.cpus().length}`,
  ].join("\n");

  console.log(
    boxen(infoText, {
      title: "System & Environment Info",
      titleAlignment: "center",
      padding: 1,
      margin: 1,
      borderStyle: "double",
      borderColor: "magenta",
    }),
  );
}
