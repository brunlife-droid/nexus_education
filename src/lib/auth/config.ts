import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findDemoUser } from "./demo-users";
import type { UserRole } from "./types";

/**
 * Configuração do NextAuth v5.
 *
 * Fase 0: usa Credentials provider com whitelist demo (sem DB).
 * Quando DATABASE_URL estiver disponível, plugar @auth/drizzle-adapter
 * e mudar para JWT + DB sessions.
 *
 * Quando NEXTAUTH_SECRET não está definido, NextAuth funciona em modo
 * inseguro (só dev). Em produção, é obrigatório.
 */

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET ?? "dev-only-secret-replace-me",
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/entrar",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const demo = findDemoUser(email, password);
        if (!demo) return null;

        return {
          id: demo.id,
          email: demo.email,
          name: demo.name,
          image: demo.image,
          role: demo.role,
          tenantId: demo.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: UserRole }).role;
        token.tenantId = (user as { tenantId?: string }).tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as UserRole) ?? "aluno";
        session.user.tenantId = (token.tenantId as string) ?? "alfenas";
      }
      return session;
    },
  },
};

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
