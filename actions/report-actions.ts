'use server';

import { prisma } from '@/lib/prisma';
import { fetchAggregatedMetricsAction } from '@/actions/meta-actions';
import { calculateAvailableBalance } from '@/lib/balance-utils';
import { generateReportText } from '@/lib/report-utils';
import { createReportLog } from '@/lib/report-log';


/**
 * Sends a daily WhatsApp Business report for a specific account.
 * WhatsApp Business API credentials must be configured via environment variables.
 */
export async function sendDailyReportAction(accountId: string) {
    try {
        const account = await prisma.account.findFirst({
            where: {
                OR: [
                    { id: accountId },
                    { account_id: accountId },
                    { account_id: accountId.replace('act_', '') }
                ]
            },
        });

        if (!account || !account.daily_report_enabled) {
            return { success: false, error: 'Account not found or daily report not enabled' };
        }

        // Verificar se UazAPI está configurado para o workspace desta conta
        if (!account.workspace_id) {
            return { success: false, error: 'Conta sem workspace vinculado' };
        }
        const setting = await prisma.setting.findUnique({
            where: { workspace_id: account.workspace_id },
        });
        if (!setting?.uazapi_url || !setting?.uazapi_token || !setting?.uazapi_instance) {
            console.log(`[Report] UazAPI não configurado para o workspace. Pulando ${account.account_name}.`);
            return { success: false, error: 'UazAPI não configurado. Configure em Relatórios WhatsApp.' };
        }
        if (!setting?.whatsapp_number) {
            return { success: false, error: 'Número destino não configurado nas configurações.' };
        }

        // 2. Fetch Metrics
        const range = account.daily_report_range || 'today';
        const metrics = await fetchAggregatedMetricsAction(account.account_id, range);

        if (!metrics) {
            return { success: false, error: 'Failed to fetch metrics' };
        }

        // 3. Check if already sent today
        const now = new Date();
        if (account.last_wa_report_sent_at) {
            const lastSent = new Date(account.last_wa_report_sent_at);
            const lastSentDateBRT = lastSent.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const nowDateBRT = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            if (lastSentDateBRT === nowDateBRT) {
                return { success: false, error: 'Report already sent today via WhatsApp' };
            }
        }

        // 4. Generate Message
        const accountInfo = metrics.accountInfo;
        const fundingSource = accountInfo?.funding_source_details;
        const isCardAccount = fundingSource?.type === "1" ||
            fundingSource?.display_string?.toLowerCase().includes("visa") ||
            fundingSource?.display_string?.toLowerCase().includes("mastercard") ||
            fundingSource?.display_string?.toLowerCase().includes("cartão") ||
            fundingSource?.display_string?.toLowerCase().includes("cartao") ||
            fundingSource?.display_string?.toLowerCase().includes("card");
        const isPrepay = accountInfo ? (!!accountInfo.is_prepay_account && !isCardAccount) : false;
        const balance = isPrepay ? calculateAvailableBalance(accountInfo!) : 0;
        const message = generateReportText({
            accountName: account.account_name,
            metrics: { ...metrics, balance },
            currency: account.currency,
            range,
            platform: 'WhatsApp',
            metricConfig: (account as any).report_metrics_config as Record<string, boolean> | undefined,
            customMessage: (account as any).report_custom_message || undefined,
            isPrepay
        });

        // 5. Enviar via UazAPI
        const { sendTextMessage } = await import('@/lib/uazapi');
        const uazResult = await sendTextMessage(
            {
                baseUrl:  setting.uazapi_url.replace(/\/$/, ''),
                token:    setting.uazapi_token,
                instance: setting.uazapi_instance,
            },
            setting.whatsapp_number,
            message,
        );
        if (!uazResult.success) {
            throw new Error(`Falha ao enviar via UazAPI: ${uazResult.error}`);
        }
        console.log(`[Report] Relatório enviado via UazAPI para ${account.account_name}. msgId=${uazResult.messageId}`);

        // 6. Update last_wa_report_sent_at
        await prisma.account.update({
            where: { id: accountId },
            data: { last_wa_report_sent_at: now }
        });

        await createReportLog({
            account_id: account.id,
            account_name: account.account_name,
            channel: "whatsapp",
            status: "success",
            range,
            workspace_id: account.workspace_id || undefined,
        });

        return { success: true };

    } catch (error: any) {
        console.error(`Error sending report for account ${accountId}:`, error);
        try {
            const acc = await prisma.account.findFirst({ where: { OR: [{ id: accountId }, { account_id: accountId }] } });
            if (acc) {
                await createReportLog({
                    account_id: acc.id,
                    account_name: acc.account_name,
                    channel: "whatsapp",
                    status: "error",
                    error_msg: error.message,
                    workspace_id: acc.workspace_id || undefined,
                });
            }
        } catch { /* ignore */ }
        return { success: false, error: error.message };
    }
}

/**
 * Trigger to send reports for ALL enabled accounts via WhatsApp Business
 */
export async function sendAllDailyReportsAction(platformType: 'all' | 'wa' = 'all') {
    try {
        const now = new Date();
        const nowBR  = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const brHour = nowBR.getHours();
        const brTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

        // Only send between 09:00 and 10:00 BRT — prevents sending outside the allowed window
        if (brHour < 9 || brHour >= 10) {
            console.log(`[Cron] Outside allowed window (09:00–10:00 BRT). Current time: ${brTime}. Skipping all sends.`);
            return { success: true, summary: 'Fora da janela de envio (09:00–10:00 BRT)', total: 0 };
        }

        console.log(`[Cron] Starting daily reports run at ${brTime} (BR Time)`);

        const allAccounts = await prisma.account.findMany({
            where: { daily_report_enabled: true }
        });

        const waAccounts = allAccounts.filter(account => {
            if (!account.daily_report_enabled || !account.daily_report_time) return false;

            const isDue = brTime >= account.daily_report_time;

            let alreadySent = false;
            if (account.last_wa_report_sent_at) {
                const lastSent = new Date(account.last_wa_report_sent_at);
                const lastSentDateBRT = lastSent.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                const nowDateBRT = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                alreadySent = lastSentDateBRT === nowDateBRT;
            }

            return isDue && !alreadySent;
        });

        if (waAccounts.length > 0) console.log(`[Cron] Found ${waAccounts.length} accounts due for WhatsApp.`);

        const waResults = [];
        for (const account of waAccounts) {
            try {
                const res = await sendDailyReportAction(account.id);
                waResults.push({ status: 'fulfilled', value: res });
            } catch (err) {
                waResults.push({ status: 'rejected', reason: err });
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const totalSuccess = waResults.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;

        // ── Run ReportAutomation records ──────────────────────────────────────
        const { sendAutomationReport } = await import('@/actions/automation-actions');
        // ── Weekend skip at batch level ───────────────────────────────────────
        const nowBRBatch   = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const dayBRBatch   = nowBRBatch.getDay(); // 0=Dom, 6=Sáb
        const isWeekendNow = dayBRBatch === 0 || dayBRBatch === 6;

        const automations = await prisma.reportAutomation.findMany({ where: { enabled: true } });

        let autoSuccess = 0;
        for (const automation of automations) {
            const isDue = brTime >= automation.schedule_time;
            let alreadySent = false;
            if (automation.last_sent_at) {
                const lastDate = automation.last_sent_at.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                const nowDate  = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                alreadySent = lastDate === nowDate;
            }
            if (!isDue || alreadySent) continue;
            // Skip weekend at batch level (fast path — avoids re-fetching from DB inside sendAutomationReport)
            if (isWeekendNow && (automation as any).skip_weekends) continue;
            const res = await sendAutomationReport(automation.id, automation.workspace_id, true);
            if (res.success) autoSuccess++;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (automations.length > 0) console.log(`[Cron] Automations: ${autoSuccess}/${automations.length} sent.`);

        return {
            success: true,
            summary: `Individual: ${totalSuccess}/${waResults.length}. Automações: ${autoSuccess}/${automations.length}.`,
            total: waResults.length + automations.length,
        };

    } catch (error: any) {
        console.error('Critical error in sendAllDailyReportsAction:', error);
        return { success: false, error: error.message };
    }
}
