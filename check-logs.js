const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- ULTIMOS 5 LOGS DE WEBHOOK ---');
    try {
        const logs = await prisma.webhookLog.findMany({
            take: 5,
            orderBy: { receivedAt: 'desc' }
        });

        if (logs.length === 0) {
            console.log('Nenhum log encontrado. Meta ainda nao entrou em contato com o servidor.');
        } else {
            logs.forEach(log => {
                console.log(`[${log.receivedAt.toISOString()}] Payload:`);
                console.log(JSON.stringify(JSON.parse(log.payload), null, 2));
                console.log('-------------------');
            });
        }
    } catch (e) {
        console.error('Erro ao buscar logs:', e.message);
        console.log('DICA: Voce rodou "npx prisma db push" para criar a tabela de logs?');
    } finally {
        await prisma.$disconnect();
    }
}

main();
