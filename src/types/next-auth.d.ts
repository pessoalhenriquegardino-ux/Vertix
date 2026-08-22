import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "CLIENT";
      clientId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "CLIENT";
    clientId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "CLIENT";
    clientId: string | null;
  }
}
