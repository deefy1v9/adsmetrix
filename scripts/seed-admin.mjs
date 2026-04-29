// Standalone seed script for production (runs with Node.js directly)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "deefy07@gmail.com";
    const password = "Admin@123";
    const name = "Admin";

    const hashedPassword = await bcrypt.hash(password, 12);

    // 1. Garantir que existe um Workspace
    const workspace = await prisma.workspace.upsert({
        where: { id: 'default-workspace-id' }, // ID fixo para o principal
        update: {},
        create: {
            id: 'default-workspace-id',
            nome_empresa: "Ads Manager",
            status: "ACTIVE"
        }
    });

    // 2. Criar Admin apenas se não existir — preserva senha e workspace_id em deploys subsequentes
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log(`Admin user already exists, skipping seed: ${email}`);
    } else {
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: "SuperAdmin",
                is_super_admin: true,
                workspace_id: workspace.id
            },
        });
        console.log(`Admin user created: ${email}`);
    }
}

main()
    .catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
