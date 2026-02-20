import { execSync } from "child_process";

try {
  console.log("Running prisma generate...");
  execSync("npx prisma generate", { stdio: "inherit", cwd: process.cwd() });
  console.log("Prisma client generated successfully.");
} catch (error) {
  console.error("Failed to generate Prisma client:", error.message);
  process.exit(1);
}
