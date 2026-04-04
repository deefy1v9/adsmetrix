"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { UazAPIPanel } from "@/components/features/whatsapp/UazAPIPanel";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h2>
                <p className="text-muted-foreground">Gerencie suas preferências e conexões.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile Settings */}
                <GlassCard className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Perfil</h3>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Nome</label>
                        <Input defaultValue="Administrador" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <Input defaultValue="admin@metaads.com" />
                    </div>
                    <Button>Salvar Alterações</Button>
                </GlassCard>

                {/* API Connections */}
                <GlassCard className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">Conexões</h3>
                        <Badge variant="neutral" className="text-[10px] uppercase">Meta Ads</Badge>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground">f</div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">Meta Ads API</p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Auto-Gerenciável</p>
                                </div>
                            </div>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => window.location.href = '/api/auth/meta'}
                            >
                                Conectar Facebook
                            </Button>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-foreground">Diagnóstico de Webhook</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] uppercase hover:bg-muted"
                                    onClick={async () => {
                                        const { retrySubscribeAction } = await import('@/actions/meta-actions');
                                        const res = await retrySubscribeAction();
                                        alert(res.message || (res.success ? "Sucesso!" : "Erro: " + res.error));
                                    }}
                                >
                                    Refazer Inscrição
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Se os leads não estiverem chegando, clique em "Refazer Inscrição".
                                <strong> Nota:</strong> Webhooks não funcionam em <code>localhost</code> sem tunelamento (ngrok/cloudflare).
                            </p>
                        </div>
                    </div>

                </GlassCard>

                {/* WhatsApp / UazAPI */}
                <div className="md:col-span-2">
                    <UazAPIPanel />
                </div>

                {/* System Preferences */}
                <GlassCard className="space-y-4 md:col-span-2">
                    <h3 className="text-lg font-semibold text-foreground">Preferências do Sistema</h3>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                        <div>
                            <p className="text-sm font-medium text-foreground">Modo Escuro</p>
                            <p className="text-xs text-muted-foreground">Ativar tema escuro por padrão.</p>
                        </div>
                        <Badge variant="success">Ativado</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border">
                        <div>
                            <p className="text-sm font-medium text-foreground">Notificações por Email</p>
                            <p className="text-xs text-muted-foreground">Receber alertas de novos leads.</p>
                        </div>
                        <Button variant="outline" size="sm">Configurar</Button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
