import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const allLeads = await prisma.lead.findMany()
    console.log(`Total leads: ${allLeads.length}`)

    const nullAccountLeads = await prisma.lead.findMany({
        where: { account_id: null }
    })
    console.log(`Leads with null account: ${nullAccountLeads.length}`)

    if (allLeads.length > 0) {
        console.log("Sample lead:")
        console.log(allLeads[0])
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
