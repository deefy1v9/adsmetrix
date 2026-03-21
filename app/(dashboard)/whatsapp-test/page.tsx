import { WhatsAppReportBuilder } from '@/components/features/whatsapp/WhatsAppTestPanel';

export default function WhatsAppTestPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                    WhatsApp Business API
                </h1>
                <p className="text-muted-foreground">
                    Envie relatórios automáticos para seus clientes via WhatsApp Business
                </p>
            </div>

            <WhatsAppReportBuilder />
        </div>
    );
}
