import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
    // The UserSession row for this specific device/browser - not a
    // secret, just an id, exposed so Settings -> Sitzungen can mark
    // "this device" in the list.
    sid?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    isAdmin: boolean;
    // UserSession.id this token is tied to - see auth.ts jwt() callback
    // for why (revocable sessions on top of an otherwise self-contained
    // JWT).
    sid?: string;
    revoked?: boolean;
  }
}
