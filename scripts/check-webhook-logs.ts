import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const logs = await prisma.webhookLog.findMany({
        orderBy: { receivedAt: 'desc' },
        take: 5
    })

    console.log("Latest Webhook Logs:")
    logs.forEach(l => {
        console.log(`[${l.receivedAt}] ${l.payload}`)
    })
}

main().catch(console.error).finally(() => prisma.$disconnect())
