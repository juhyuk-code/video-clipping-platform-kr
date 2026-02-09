import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      nickname?: string | null;
      role?: string | null;
    } & DefaultSession["user"];
  }
}
