import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'file:./dev.db'
})

async function main() {
    console.log('Seeding database...')

    // Create Account
    const account = await prisma.account.create({
        data: {
            account_id: 'act_123456789',
            account_name: 'Viver de IA - Principal',
            client_name: 'Viver de IA',
            balance: 1500.00,
            amount_spent: 4500.00,
            currency: 'BRL',
            account_status: 'ACTIVE',
            is_prepay: false,
        },
    })

    // Create Campaign
    const campaign = await prisma.campaign.create({
        data: {
            account_id: account.id,
            campaign_id: 'camp_987654321',
            campaign_name: 'Campanha Branding 2024',
            impressions: 15000,
            clicks: 350,
            spend: 450.00,
            cpm: 30.00,
            cpc: 1.28,
            ctr: 2.33,
            conversions: 45,
            cost_per_conversion: 10.00,
            date: new Date(),
        },
    })

    // Create Leads
    await prisma.lead.createMany({
        data: [
            {
                lead_id: 'lead_111',
                account_id: account.id,
                campaign_id: campaign.campaign_id,
                campaign_name: campaign.campaign_name,
                full_name: 'João Silva',
                email: 'joao@example.com',
                phone: '5511999999999',
                created_time: new Date(),
                status: 'novo',
                ad_name: 'Ad 1 - Vídeo',
                adset_name: 'Interesses - Tech',
            },
            {
                lead_id: 'lead_222',
                account_id: account.id,
                campaign_id: campaign.campaign_id,
                campaign_name: campaign.campaign_name,
                full_name: 'Maria Oliveira',
                email: 'maria@example.com',
                phone: '5511888888888',
                created_time: new Date(Date.now() - 86400000), // yesterday
                status: 'contatado',
                ad_name: 'Ad 2 - Imagem',
                adset_name: 'Lookalike 1%',
            },
            {
                lead_id: 'lead_333',
                account_id: account.id,
                campaign_id: campaign.campaign_id,
                campaign_name: campaign.campaign_name,
                full_name: 'Carlos Souza',
                email: 'carlos@example.com',
                phone: '5511777777777',
                created_time: new Date(Date.now() - 172800000), // 2 days ago
                status: 'convertido',
                ad_name: 'Ad 1 - Vídeo',
                adset_name: 'Interesses - Tech',
            },
        ],
    })

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
