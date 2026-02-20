import { execSync } from "child_process";

try {
  const output = execSync("npx prisma generate", {
    cwd: "/vercel/share/v0-project",
    stdio: "pipe",
    encoding: "utf-8",
  });
  console.log(output);
  console.log("Prisma client generated successfully.");
} catch (err) {
  console.error("Failed to generate Prisma client:", err.stdout || err.message);
  process.exit(1);
}
