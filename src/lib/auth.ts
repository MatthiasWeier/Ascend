import { randomUUID } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
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
      authorize: async (credentials, request) => {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        const totpToken = credentials?.totpToken as string | undefined;
        const userAgent = request.headers.get("user-agent");
        if (!username || !password) return null;

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

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          isAdmin: user.isAdmin,
          userAgent,
        };
      },
    }),
  ],
  callbacks: {
    // A JWT is normally self-contained and can't be invalidated early -
    // this DB check (UserSession) is what actually makes "sign out this
    // device" / "sign out everywhere" in Settings work, instead of
    // deleting a cookie nobody's looking at. Runs on every session read
    // (not just sign-in), so revocation takes effect on the very next
    // request, at the cost of one extra localhost query per request -
    // negligible for this app's scale (same tradeoff as `isAdmin()`).
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username: string }).username;
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin;
        const sessionId = randomUUID();
        token.sid = sessionId;
        await prisma.userSession.create({
          data: {
            id: sessionId,
            userId: user.id as string,
            userAgent: (user as { userAgent?: string | null }).userAgent ?? null,
          },
        });
        return token;
      }

      if (!token.sid) {
        // Pre-existing token from before session tracking existed - adopt
        // it into the tracking table now rather than forcing a re-login.
        const sessionId = randomUUID();
        token.sid = sessionId;
        await prisma.userSession.create({ data: { id: sessionId, userId: token.id as string } });
        return token;
      }

      const stillActive = await prisma.userSession.findUnique({ where: { id: token.sid as string } });
      if (!stillActive) {
        token.revoked = true;
        return token;
      }
      // Fire-and-forget - a slow/failed heartbeat write must never delay
      // or fail the actual request.
      prisma.userSession
        .update({ where: { id: token.sid as string }, data: { lastSeenAt: new Date() } })
        .catch(() => {});

      return token;
    },
    session({ session, token }) {
      if (token.revoked) {
        return { ...session, user: undefined as never };
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.sid = token.sid as string | undefined;
      }
      return session;
    },
  },
});
