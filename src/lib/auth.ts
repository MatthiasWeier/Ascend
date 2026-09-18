import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, envInt } from "@/lib/rate-limit";
import { verifyTotpToken } from "@/lib/totp";
import { consumeBackupCode } from "@/lib/totp-backup-codes";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
        totpToken: {},
      },
      authorize: async (credentials) => {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        const totpToken = credentials?.totpToken as string | undefined;
        if (!username || !password) return null;

        // Lock out after repeated failures against a given username -
        // brute-force protection. Doesn't distinguish "locked" from "wrong
        // password" in the response so it can't be used to enumerate which
        // usernames are close to locking.
        const { allowed } = rateLimit(
          `login:${username.toLowerCase()}`,
          envInt("LOGIN_RATE_LIMIT_MAX", 10),
          envInt("LOGIN_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000)
        );
        if (!allowed) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (user.totpEnabled) {
          if (!totpToken) return null;
          const validTotp = user.totpSecret ? verifyTotpToken(user.totpSecret, totpToken) : false;
          const validBackup = validTotp ? false : await consumeBackupCode(user.id, totpToken);
          if (!validTotp && !validBackup) return null;
        }

        return { id: user.id, name: user.name, username: user.username, isAdmin: user.isAdmin };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username: string }).username;
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
});
