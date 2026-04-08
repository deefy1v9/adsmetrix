'use client';

import { useEffect, useState, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    getUazAPIStatusAction,
    getUazAPIQRCodeAction,
    saveUazAPIConfigAction,
    sendTestMessageAction,
    getWorkspaceSettingAction,
    saveMetaWAConfigAction,
    getMetaWAConfigAction,
    fetchMetaWATemplatesAction,
} from '@/actions/uazapi-actions';
import {
    Wifi, WifiOff, QrCode, Save, Send, RefreshCw,
    CheckCircle2, XCircle, Loader2, Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Meta API Config Panel ─────────────────────────────────────────────────────

function MetaAPIPanel() {
    const [phoneNumberId, setPhoneNumberId] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
    const [templates, setTemplates] = useState<{ id: string; name: string; status: string; language: string }[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    useEffect(() => {
        getMetaWAConfigAction().then(cfg => {
            if (cfg) {
                setPhoneNumberId(cfg.phoneNumberId);
                setAccessToken(cfg.accessToken);
            }
        });
    }, []);

    async function handleSave() {
        setSaving(true);
        setResult(null);
        const r = await saveMetaWAConfigAction(phoneNumberId.trim(), accessToken.trim());
        setResult(r);
        setSaving(false);
    }

    async function handleFetchTemplates() {
        setLoadingTemplates(true);
        const tpls = await fetchMetaWATemplatesAction();
        setTemplates(tpls);
        setLoadingTemplates(false);
    }

    return (
        <GlassCard className="space-y-5">
            <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Meta API Oficial (WABA)</h3>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
                Para envios de templates aprovados para números individuais. Não suporta grupos.
            </p>

            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone Number ID</label>
                    <Input
                        placeholder="Ex: 123456789012345"
                        value={phoneNumberId}
                        onChange={e => setPhoneNumberId(e.target.value)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Token de Acesso Permanente</label>
                    <Input
                        type="password"
                        placeholder="EAAxxxx..."
                        value={accessToken}
                        onChange={e => setAccessToken(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex gap-2">
                <Button
                    onClick={handleSave}
                    disabled={saving || !phoneNumberId || !accessToken}
                    variant="primary"
                    className="flex-1"
                >
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…</> : <><Save className="h-4 w-4 mr-2" /> Salvar</>}
                </Button>
                <Button
                    onClick={handleFetchTemplates}
                    disabled={loadingTemplates || !phoneNumberId || !accessToken}
                    variant="secondary"
                    className="flex-1"
                >
                    {loadingTemplates ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando…</> : 'Ver Templates'}
                </Button>
            </div>

            {result && (
                <div className={cn('flex items-center gap-2 text-sm p-3 rounded-lg',
                    result.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20')}>
                    {result.success ? <><CheckCircle2 className="h-4 w-4 shrink-0" /> Configuração salva!</>
                        : <><XCircle className="h-4 w-4 shrink-0" /> {result.error}</>}
                </div>
            )}

            {templates.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Templates aprovados</p>
                    <div className="rounded-xl border border-border divide-y divide-border max-h-48 overflow-y-auto">
                        {templates.map(t => (
                            <div key={t.id} className="flex items-center justify-between px-3 py-2">
                                <span className="font-mono text-xs text-foreground">{t.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{t.language}</span>
                                    <span className={cn("text-xs font-medium", t.status === "APPROVED" ? "text-emerald-400" : "text-amber-400")}>
                                        {t.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </GlassCard>
    );
}

// ── UazAPI Panel ──────────────────────────────────────────────────────────────

export function UazAPIPanel() {
    const [status, setStatus] = useState<{
        configured: boolean; connected: boolean; loggedIn: boolean; state?: string;
    } | null>(null);
    const [qrcode,       setQrcode]       = useState<string | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [loadingQR,    setLoadingQR]    = useState(false);
    const [qrError,      setQrError]      = useState<string | null>(null);
    const [savingConfig, setSavingConfig] = useState(false);
    const [sendingTest,  setSendingTest]  = useState(false);
    const [saveResult,   setSaveResult]   = useState<{ success: boolean; error?: string } | null>(null);
    const [testResult,   setTestResult]   = useState<{ success: boolean; error?: string } | null>(null);

    const [form, setForm] = useState({
        uazapi_url:      '',
        uazapi_token:    '',
        uazapi_instance: '',
        whatsapp_number: '',
    });

    const checkStatus = useCallback(async () => {
        setLoadingStatus(true);
        const s = await getUazAPIStatusAction();
        setStatus(s);
        setLoadingStatus(false);
    }, []);

    useEffect(() => {
        getWorkspaceSettingAction().then(setting => {
            if (setting) {
                setForm({
                    uazapi_url:      setting.uazapi_url      || '',
                    uazapi_token:    setting.uazapi_token     || '',
                    uazapi_instance: setting.uazapi_instance  || '',
                    whatsapp_number: setting.whatsapp_number  || '',
                });
            }
        });
        checkStatus();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleGetQR = async () => {
        setLoadingQR(true);
        setQrcode(null);
        setQrError(null);
        const { qrcode, error } = await getUazAPIQRCodeAction();
        setQrcode(qrcode);
        if (!qrcode) setQrError(error || 'QR code não retornado pelo servidor');
        setLoadingQR(false);
        let attempts = 0;
        const poll = setInterval(async () => {
            attempts++;
            const s = await getUazAPIStatusAction();
            setStatus(s);
            if (s.connected || attempts >= 12) {
                clearInterval(poll);
                if (s.connected) setQrcode(null);
            }
        }, 5000);
    };

    const handleSaveConfig = async () => {
        setSavingConfig(true);
        setSaveResult(null);
        const result = await saveUazAPIConfigAction(form);
        setSaveResult(result);
        setSavingConfig(false);
        if (result.success) checkStatus();
    };

    const handleSendTest = async () => {
        setSendingTest(true);
        setTestResult(null);
        const result = await sendTestMessageAction();
        setTestResult(result);
        setSendingTest(false);
    };

    const isConnected = status?.connected && status?.loggedIn;

    return (
        <>
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Config Form */}
            <GlassCard className="space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">Configuração UazAPI</h3>
                    <div className="flex items-center gap-2">
                        {status === null || loadingStatus ? (
                            <Badge variant="default" className="gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" /> Verificando…
                            </Badge>
                        ) : isConnected ? (
                            <Badge variant="success" className="gap-1">
                                <Wifi className="h-3 w-3" /> Conectado
                            </Badge>
                        ) : status.configured ? (
                            <Badge variant="default" className="gap-1 bg-amber-500/20 text-amber-400 border-amber-500/30">
                                <WifiOff className="h-3 w-3" /> Desconectado
                            </Badge>
                        ) : (
                            <Badge variant="default" className="gap-1">
                                <WifiOff className="h-3 w-3" /> Não configurado
                            </Badge>
                        )}
                        <button
                            onClick={checkStatus}
                            disabled={loadingStatus}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"
                            title="Atualizar status"
                        >
                            <RefreshCw className={cn('h-4 w-4', loadingStatus && 'animate-spin')} />
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            URL do Servidor UazAPI
                        </label>
                        <Input
                            placeholder="https://meu-servidor.com"
                            value={form.uazapi_url}
                            onChange={e => setForm(f => ({ ...f, uazapi_url: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Token de API
                        </label>
                        <Input
                            type="password"
                            placeholder="Seu API key / token"
                            value={form.uazapi_token}
                            onChange={e => setForm(f => ({ ...f, uazapi_token: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Nome da Instância
                        </label>
                        <Input
                            placeholder="ex: minha-instancia"
                            value={form.uazapi_instance}
                            onChange={e => setForm(f => ({ ...f, uazapi_instance: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Número Destino Padrão
                        </label>
                        <Input
                            placeholder="5511999999999 (só números, com DDI)"
                            value={form.whatsapp_number}
                            onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Usado quando a automação está configurada como "Número padrão".
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        onClick={handleSaveConfig}
                        disabled={savingConfig || !form.uazapi_url || !form.uazapi_token || !form.uazapi_instance}
                        variant="primary"
                        className="flex-1"
                    >
                        {savingConfig
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…</>
                            : <><Save className="h-4 w-4 mr-2" /> Salvar</>}
                    </Button>
                    <Button
                        onClick={handleSendTest}
                        disabled={sendingTest || !status?.configured || !form.whatsapp_number}
                        variant="secondary"
                        className="flex-1"
                    >
                        {sendingTest
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</>
                            : <><Send className="h-4 w-4 mr-2" /> Testar</>}
                    </Button>
                </div>

                {saveResult && (
                    <div className={cn(
                        'flex items-center gap-2 text-sm p-3 rounded-lg',
                        saveResult.success
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20',
                    )}>
                        {saveResult.success
                            ? <><CheckCircle2 className="h-4 w-4 shrink-0" /> Configuração salva!</>
                            : <><XCircle className="h-4 w-4 shrink-0" /> {saveResult.error}</>}
                    </div>
                )}
                {testResult && (
                    <div className={cn(
                        'flex items-center gap-2 text-sm p-3 rounded-lg',
                        testResult.success
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20',
                    )}>
                        {testResult.success
                            ? <><CheckCircle2 className="h-4 w-4 shrink-0" /> Mensagem de teste enviada!</>
                            : <><XCircle className="h-4 w-4 shrink-0" /> {testResult.error}</>}
                    </div>
                )}
            </GlassCard>

            {/* QR Code / Status */}
            <GlassCard className="flex flex-col items-center justify-center gap-6 min-h-64">
                {isConnected ? (
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">WhatsApp Conectado</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Instância <span className="font-mono text-primary">{form.uazapi_instance}</span> está ativa.
                            </p>
                        </div>
                    </div>
                ) : qrcode ? (
                    <div className="text-center space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">
                            Escaneie o QR code com o WhatsApp
                        </p>
                        <div className="bg-white p-3 rounded-xl inline-block">
                            <img
                                src={qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`}
                                alt="QR Code WhatsApp"
                                className="w-48 h-48 object-contain"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Aguardando conexão… (atualiza automaticamente)</p>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                            <QrCode className="h-8 w-8 text-muted-foreground opacity-40" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">Conectar WhatsApp</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {status?.configured
                                    ? 'Clique para gerar o QR code e escanear com seu WhatsApp.'
                                    : 'Salve a configuração primeiro para conectar.'}
                            </p>
                        </div>
                        <Button
                            onClick={handleGetQR}
                            disabled={loadingQR || !status?.configured}
                            variant="primary"
                        >
                            {loadingQR
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando QR…</>
                                : <><QrCode className="h-4 w-4 mr-2" /> Gerar QR Code</>}
                        </Button>
                        {qrError && (
                            <div className="max-w-xs text-center text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                {qrError}
                            </div>
                        )}
                    </div>
                )}
            </GlassCard>
        </div>

        {/* Meta API Official */}
        <div className="mt-6">
            <MetaAPIPanel />
        </div>
        </>
    );
}
