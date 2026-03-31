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
} from '@/actions/uazapi-actions';
import {
    Wifi, WifiOff, QrCode, Save, Send, RefreshCw,
    CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function UazAPIPanel() {
    const [status, setStatus] = useState<{
        configured: boolean; connected: boolean; loggedIn: boolean; state?: string;
    } | null>(null);
    const [qrcode,       setQrcode]       = useState<string | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [loadingQR,    setLoadingQR]    = useState(false);
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
        const { qrcode } = await getUazAPIQRCodeAction();
        setQrcode(qrcode);
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
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
