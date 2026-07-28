import picocolors from "picocolors";

export const logger = {
  info: (msg: string) => {
    console.log(`${picocolors.blue("ℹ")} ${msg}`);
  },
  success: (msg: string) => {
    console.log(`${picocolors.green("✔")} ${msg}`);
  },
  warn: (msg: string) => {
    console.warn(`${picocolors.yellow("⚠")} ${msg}`);
  },
  error: (msg: string) => {
    console.error(`${picocolors.red("✖")} ${msg}`);
  },
  step: (step: number, total: number, msg: string) => {
    console.log(`${picocolors.cyan(`[${step}/${total}]`)} ${msg}`);
  },
  dim: (msg: string) => {
    console.log(picocolors.dim(msg));
  },
  bold: (msg: string) => picocolors.bold(msg),
};
