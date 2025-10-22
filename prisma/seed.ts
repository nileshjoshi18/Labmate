import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const userData = [
  {
    name: "Alice",
    email: "alice@example.com",
    image: "https://i.pravatar.cc/150?img=1",
    plainPassword: "alice123", // This will be hashed
  },
  {
    name: "Bob",
    email: "bob@example.com",
    image: "https://i.pravatar.cc/150?img=2",
    plainPassword: "bob123", // This will be hashed
  },
];

async function main() {
  console.log("🌱 Seeding database...");
  
  for (const u of userData) {
    // Hash the password
    const hashedPassword = await bcrypt.hash(u.plainPassword, 10);
    
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword, // Update password if user exists
      },
      create: {
        name: u.name,
        email: u.email,
        image: u.image,
        password: hashedPassword, // Create with hashed password
      },
    });
    
    console.log(`✅ ${u.name}: email=${u.email}, password=${u.plainPassword}`);
  }
  
  console.log("✅ Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });