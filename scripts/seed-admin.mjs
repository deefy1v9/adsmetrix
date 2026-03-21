// Standalone seed script for production (runs with Node.js directly)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@grupodpg.com.br";
    const password = "Admin@123";
    const name = "Admin DPG";

    const hashedPassword = await bcrypt.hash(password, 12);

    // 1. Garantir que existe um Workspace
    const workspace = await prisma.workspace.upsert({
        where: { id: 'default-workspace-id' }, // ID fixo para o principal
        update: {},
        create: {
            id: 'default-workspace-id',
            nome_empresa: "DPG Digital",
            status: "ACTIVE"
        }
    });

    // 2. Criar/Atualizar Admin vinculado ao Workspace
    await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            name,
            role: "SuperAdmin",
            is_super_admin: true,
            workspace_id: workspace.id
        },
        create: {
            email,
            password: hashedPassword,
            name,
            role: "SuperAdmin",
            is_super_admin: true,
            workspace_id: workspace.id
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
