"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Bell, AlertTriangle, CheckCircle, Info } from "lucide-react";

const notifications = [
    {
        id: 1,
        title: "Novo Lead - Campanha Black Friday",
        description: "Lead 'João Silva' cadastrou-se via Facebook Ads.",
        time: "2 min atrás",
        type: "success",
        read: false,
    },
    {
        id: 2,
        title: "Saldo Baixo - Conta Principal",
        description: "O saldo da conta ' - Principal' está abaixo de R$ 100,00.",
        time: "1 hora atrás",
        type: "warning",
        read: false,
    },
    {
        id: 3,
        title: "Relatório Diário Disponível",
        description: "O relatório de performance de ontem já está disponível para visualização.",
        time: "5 horas atrás",
        type: "info",
        read: true,
    },
];

const iconMap: Record<string, any> = {
    success: CheckCircle,
    warning: AlertTriangle,
    info: Info,
};

const colorMap: Record<string, string> = {
    success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    info: "text-foreground bg-muted",
};

export default function NotificationsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Notificações</h2>
                <p className="text-muted-foreground">Fique por dentro do que acontece nas suas contas.</p>
            </div>

            <div className="space-y-4">
                {notifications.map((notification) => {
                    const Icon = iconMap[notification.type] || Bell;
                    return (
                        <GlassCard key={notification.id} className={`flex items-start gap-4 p-4 ${!notification.read ? 'border-l-4 border-l-primary' : ''}`}>
                            <div className={`rounded-full p-2 ${colorMap[notification.type]}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className={`text-sm font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {notification.title}
                                    </h4>
                                    <span className="text-xs text-muted-foreground">{notification.time}</span>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground/80">{notification.description}</p>
                            </div>
                        </GlassCard>
                    )
                })}
            </div>
        </div>
    );
}
