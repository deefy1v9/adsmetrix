import { GlassCard } from '@/components/ui/GlassCard';
import { Calendar, Send, CheckSquare, Square, Layers, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { WhatsAppReportBuilder } from '@/components/features/whatsapp/WhatsAppTestPanel';

export default function WhatsAppReportsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                    Relatórios WhatsApp
                </h1>
                <p className="text-muted-foreground">
                    Crie e envie relatórios personalizados para seus clientes via WhatsApp Business
                </p>
            </div>

            <WhatsAppReportBuilder />

            <div className="grid gap-6 md:grid-cols-3">
                <GlassCard className="border-border hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary text-black rounded-full shadow-sm">
                            <CheckSquare className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Personalizado</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                        Selecione exatamente quais métricas incluir no relatório para cada cliente.
                    </p>
                </GlassCard>

                <GlassCard className="border-border hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#1C1C1C] text-primary rounded-full shadow-sm">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Flexível</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                        Escolha o período do relatório usando os filtros de data no topo da página.
                    </p>
                </GlassCard>

                <GlassCard className="border-border hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary text-black rounded-full shadow-sm">
                            <Zap className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Instantâneo</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                        Dados em tempo real das suas campanhas direto para o WhatsApp do cliente.
                    </p>
                </GlassCard>
            </div>
        </div>
    );
}
