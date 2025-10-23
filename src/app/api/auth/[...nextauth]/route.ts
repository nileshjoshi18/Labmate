// import NextAuth, { NextAuthOptions, Account, Profile, User } from "next-auth";
// import CredentialsProvider from "next-auth/providers/credentials";
// import GoogleProvider from "next-auth/providers/google";
// import bcrypt from "bcryptjs";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// // Export authOptions for reuse in other files
// export const authOptions: NextAuthOptions = {
//   providers: [
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//     CredentialsProvider({
//       name: "Credentials",
//       credentials: {
//         email: { label: "Email", type: "text" },
//         password: { label: "Password", type: "password" },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) return null;

//         const user = await prisma.user.findUnique({
//           where: { email: credentials.email },
//         });

//         if (!user || !user.password) return null;

//         const isValid = await bcrypt.compare(credentials.password, user.password);
//         if (!isValid) return null;

//         return {
//           id: user.id.toString(),
//           email: user.email,
//           name: user.name,
//           image: user.image,
//         };
//       },
//     }),
//   ],
//   callbacks: {
//     async signIn({
//       user,
//       account,
//       profile,
//     }: {
//       user: User;
//       account?: Account | null;
//       profile?: Profile | null;
//     }) {
//       // Handle Google OAuth - create or update user
//       if (account?.provider === "google") {
//         await prisma.user.upsert({
//           where: { email: user.email! },
//           update: { name: user.name, image: user.image },
//           create: {
//             email: user.email!,
//             name: user.name,
//             image: user.image,
//           },
//         });
//       }
//       return true;
//     },
//     async jwt({ token, user }: { token: any; user?: User }) {
//       if (user) token.id = user.id;
//       return token;
//     },
//     async session({
//       session,
//       token,
//     }: {
//       session: any;
//       token: any;
//     }) {
//       if (session.user) session.user.id = token.id as string;
//       return session;
//     },
//   },
//   session: { strategy: "jwt" },
//   secret: process.env.NEXTAUTH_SECRET,
//   pages: {
//     signIn: "/auth/signin", // optional custom sign-in page
//   },
// };

// // Export NextAuth handler for GET and POST
// const handler = NextAuth(authOptions);
// export { handler as GET, handler as POST };
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
