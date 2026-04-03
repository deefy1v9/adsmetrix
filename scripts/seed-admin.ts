import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@grupodpg.com.br";
    const password = "Admin@123";
    const name = "Admin";

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            name,
        },
        create: {
            email,
            password: hashedPassword,
            name,
        },
    });

    console.log(`Admin user updated/created: ${email}`);
}

main()
    .catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
