import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import Google from "next-auth/providers/google";

const providers = [
  ...(process.env.KAKAO_CLIENT_ID
    ? [Kakao({ clientId: process.env.KAKAO_CLIENT_ID, clientSecret: process.env.KAKAO_CLIENT_SECRET! })]
    : []),
  ...(process.env.NAVER_CLIENT_ID
    ? [Naver({ clientId: process.env.NAVER_CLIENT_ID, clientSecret: process.env.NAVER_CLIENT_SECRET! })]
    : []),
  ...(process.env.GOOGLE_CLIENT_ID
    ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  pages: {
    signIn: "/login",
    newUser: "/register/role",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Pass nickname through so client components can show it
        session.user.nickname = (user as any).nickname ?? null;
        session.user.role = (user as any).role ?? null;
      }
      return session;
    },
  },
});
