import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔐 Login attempt:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        console.log("👤 User found:", user ? "Yes" : "No");
        
        if (!user) {
          console.log("❌ User not found");
          return null;
        }

        if (!user.password) {
          console.log("❌ User has no password (OAuth only?)");
          return null;
        }

        console.log("🔑 Comparing passwords...");
        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        console.log("✅ Password valid:", isValid);

        if (!isValid) return null;

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth - create or update user
      if (account?.provider === "google") {
        await prisma.user.upsert({
          where: { email: user.email! },
          update: {
            name: user.name,
            image: user.image,
          },
          create: {
            email: user.email!,
            name: user.name,
            image: user.image,
            // password is NULL for OAuth users (managed by Google)
          },
        });
        
        console.log("✅ Google user saved to database:", user.email);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin", // Optional: custom sign-in page
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };