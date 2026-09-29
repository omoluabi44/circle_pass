import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    isEmailVerified?: boolean;
    accessToken?: string;
    refreshToken?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      isEmailVerified?: boolean;
    } & DefaultSession["user"];
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isEmailVerified?: boolean;
    accessToken?: string;
    refreshToken?: string;
  }
}
