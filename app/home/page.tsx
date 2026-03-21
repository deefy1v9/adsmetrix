'use client';

import React, { useEffect, useState } from 'react';
import './lp.css';
import { ArrowUpRight, Play, CheckCircle2, Plus, X, Zap, Users, Building2, TrendingUp, BarChart3 } from 'lucide-react';
import Image from 'next/image';
import ProceduralGroundBackground from '@/components/ui/procedural-ground-bg';

const featuresClara = [
    { t: "Criação com IA", d: "Descreva sua campanha e a IA gera copy, segmentação e estrutura completa pronta para publicar." },
    { t: "Múltiplas contas", d: "Gerencie dezenas de clientes Meta e Google em um só painel centralizado." },
    { t: "Integração oficial Meta", d: "Parceiro verificado Meta Business — conexão segura via API oficial." },
    { t: "Relatórios automáticos", d: "Relatórios de ROAS, CPA e CPL gerados e entregues sem intervenção manual." },
{ t: "100% personalizável", d: "Altere cores, logos e campos do dashboard para sua identidade visual." },
    { t: "Funil completo", d: "Funil de vendas, análise de criativos e perfil de público em um só lugar." },
    { t: "Plug-and-play", d: "Conecte sua conta em 3 cliques. Zero programação necessária." }
];

const dashboards = [
    { t: "DashCortex™ Meta Ads", tags: "DASH | TRÁFEGO | BARCODE" },
    { t: "DashCortex™ Google Ads", tags: "DASH | CONVERSÃO | GADS" },
    { t: "DashCortex™ Integrado", tags: "DASH | 360 | OMNI" }
];

const personas = [
    {
        icon: <Zap className="text-[#d1fb78]" />,
        t: "Gestor de Tráfego",
        d: "Crie campanhas com IA, analise resultados e entregue relatórios prontos para o cliente em minutos."
    },
    {
        icon: <Building2 className="text-[#d1fb78]" />,
        t: "Dono de Agência",
        d: "Gerencie múltiplos clientes, white label nos dashboards e relatórios automáticos que fecham mais contratos."
    },
    {
        icon: <TrendingUp className="text-[#d1fb78]" />,
        t: "Infoprodutor",
        d: "Acompanhe conversões, ROAS e criativos de toda sua esteira de lançamento em tempo real."
    },
    {
        icon: <BarChart3 className="text-[#d1fb78]" />,
        t: "Dono de Negócio",
        d: "Veja claramente onde está seu investimento e quais campanhas estão gerando retorno real."
    }
];

const faq = [
    { q: "A integração com Meta é oficial?", a: "Sim. Somos parceiros verificados Meta Business. Conexão via API oficial, 100% segura e homologada." },
    { q: "A IA realmente cria as campanhas?", a: "Sim. Descreva o produto e objetivo — a IA gera nome, segmentação, copy e estrutura de anúncios prontos para publicar diretamente na Meta." },
    { q: "Funciona com Google Ads também?", a: "Sim. Relatórios para Meta Ads e Google Ads em um só painel integrado." },
    { q: "Posso usar minha própria logo?", a: "Sim. Os dashboards são 100% white label com sua identidade visual." },
    { q: "E se eu não gostar?", a: "Você tem 7 dias de garantia incondicional. Um clique para reembolso total, sem burocracia." }
];

const tickerText = "GESTÃO DE CAMPANHAS • ANÚNCIOS COM IA • RELATÓRIOS AUTOMÁTICOS • META ADS • GOOGLE ADS • CRIATIVOS INTEGRADOS • ";

export default function DashCortexLanding() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('ativo');
                }
            });
        }, { threshold: 0.08 });

        const animatedEls = document.querySelectorAll('.showFromBottom');
        animatedEls.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <div className="dashcortex-lp">
            <ProceduralGroundBackground />
            {/* SEÇÃO 0 - Top Bar Oferta */}
            <div className="w-full bg-black h-[52px] flex items-center justify-center font-mont text-white text-[13px] font-bold tracking-[0.15em] z-50 relative uppercase">
                PLATAFORMA DE GESTÃO DE TRÁFEGO COM IA 🚀
            </div>

            {/* SEÇÃO 1 - Hero */}
            <section className="bg-dark-section min-h-[92vh] flex flex-col items-center justify-start pt-20 px-4 sm:px-6 relative overflow-hidden text-center">
                <div className="hero-bg"></div>

                <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center showFromBottom">
                    <div className="badge-pill mb-8">
                        +2 ANOS CONSTRUINDO AUTORIDADE EM TRÁFEGO PAGO
                    </div>

                    <h1 className="text-[32px] sm:text-[44px] md:text-[56px] font-[700] leading-[1.1] mb-6 tracking-tight max-w-4xl">
                        Gerencie campanhas, crie anúncios com IA <br className="hidden md:block" />
                        e automatize relatórios premium{' '}
                        <span className="blue-anim font-extrabold">em menos de 15 minutos</span>
                    </h1>

                    <p className="text-[#8aa4c8] text-lg sm:text-xl mb-10 max-w-2xl leading-relaxed">
                        Da criação da campanha ao relatório final — tudo em um só lugar. <br className="hidden sm:block" />
                        Tome decisões com dados visuais que <b className="text-white">constroem sua autoridade no mercado</b>.
                    </p>

                    <button className="cta-button mb-10">
                        Ver demonstração
                        <span className="arrow-box">
                            <ArrowUpRight size={18} />
                        </span>
                    </button>

                    <div className="flex items-center gap-4 mb-20">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full bg-[#3b4d10] border-2 border-[#030b14]"></div>
                            ))}
                        </div>
                        <p className="text-sm text-[#8aa4c8] font-mont font-semibold text-left">
                            Mais de 5 mil gestores <br />em mais de 27 países
                        </p>
                    </div>

                    {/* Logos Marquee */}
                    <div className="w-full max-w-4xl overflow-hidden mb-16 fade-edges relative">
                        <div className="flex items-center whitespace-nowrap" style={{ animation: 'txt-marquee 22s linear infinite' }}>
                            {['META BUSINESS PARTNER', 'GOOGLE CLOUD', 'LOOKER', 'META ADS', 'API OFICIAL', 'GOOGLE ADS', 'LOOKER STUDIO'].map((label, i) => (
                                <div key={i} className="px-8 text-[13px] font-bold opacity-25 tracking-widest uppercase whitespace-nowrap">{label}</div>
                            ))}
                            {['META BUSINESS PARTNER', 'GOOGLE CLOUD', 'LOOKER', 'META ADS', 'API OFICIAL', 'GOOGLE ADS', 'LOOKER STUDIO'].map((label, i) => (
                                <div key={i + 10} className="px-8 text-[13px] font-bold opacity-25 tracking-widest uppercase whitespace-nowrap">{label}</div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full max-w-4xl aspect-video bg-[#050f1e] rounded-2xl border border-[#b4f13d]/15 shadow-[0_0_80px_rgba(180,241,61,0.08),0_40px_60px_rgba(0,0,0,0.4)] relative overflow-hidden showFromBottom mx-auto mb-10 flex items-center justify-center">
                        <div className="text-[#8aa4c8] font-mont font-bold">[Dashboard Preview]</div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#030b14]/60 to-transparent pointer-events-none"></div>
                    </div>
                </div>
            </section>

            {/* SEÇÃO 2 - Ticker 1 */}
            <div className="ticker-strip ticker-dark z-20 relative">
                <div className="ticker-content">
                    {[...Array(6)].map((_, i) => (
                        <span key={i} className="ticker-item text-[#b4f13d]/60">
                            {tickerText}
                        </span>
                    ))}
                </div>
            </div>

            {/* SEÇÃO 3 - Problema e Vídeo */}
            <section className="bg-dark-section py-24 px-4 sm:px-6 relative">
                <div className="pattern-bg"></div>
                <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col showFromBottom">

                    <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center mb-28">
                        <div className="order-2 md:order-1">
                            <div className="aspect-[3/4] max-w-[380px] mx-auto bg-[#050f1e] border border-[#b4f13d]/20 rounded-3xl shadow-[0_0_60px_rgba(180,241,61,0.12)] flex items-center justify-center">
                                <div className="text-[#8aa4c8] font-mont font-bold text-sm">[Dashboard Mobile]</div>
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <div className="badge-pill mb-6">ESCALE SUA OPERAÇÃO!</div>
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 !leading-tight">
                                Decisões sem clareza custam <br />
                                <span className="blue-anim">mais do que você imagina</span>
                            </h2>
                            <p className="text-lg text-[#8aa4c8] mb-8 leading-relaxed">
                                Gestores e agências <b className="text-white">perdem horas analisando dados</b> sem sentido no gerenciador, gerando uma <b className="text-white">falta de respostas que travam decisões</b> e custam o caixa do cliente.
                            </p>
                            <button className="cta-button">
                                Quero criar minha campanha agora
                                <span className="arrow-box">
                                    <ArrowUpRight size={18} />
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Vídeo Demo */}
                    <div className="text-center max-w-4xl mx-auto w-full showFromBottom">
                        <div className="badge-pill mb-4">FACILIDADE</div>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-12">Veja como funciona na prática</h2>

                        <div className="w-full aspect-video rounded-2xl bg-[#050f1e] border border-[#b4f13d]/15 shadow-[0_0_50px_rgba(180,241,61,0.12)] relative overflow-hidden flex flex-col items-center justify-center cursor-pointer group mb-12 hover:border-[#b4f13d]/35 transition-colors duration-300">
                            <div className="w-20 h-20 bg-[#b4f13d] rounded-full flex items-center justify-center pl-1 shadow-[0_0_30px_rgba(180,241,61,0.6)] group-hover:scale-110 transition-transform duration-300">
                                <Play size={32} fill="#071627" color="#071627" />
                            </div>
                            <p className="mt-6 text-[#8aa4c8] font-mont text-sm">Seu vídeo vai começar — clique para ouvir</p>
                        </div>

                        <button className="cta-button">
                            Quero criar minha campanha agora
                            <span className="arrow-box">
                                <ArrowUpRight size={18} />
                            </span>
                        </button>
                    </div>
                </div>
            </section>

            {/* SEÇÃO 4 - Features (Claro) */}
            <section className="bg-light-section py-24 px-4 sm:px-6">
                <div className="w-full max-w-6xl mx-auto flex flex-col items-center showFromBottom">
                    <div className="badge-pill !border-gray-200 !text-[#8cb528] mb-6 bg-white shadow-sm">RESOURCES</div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 max-w-3xl leading-tight">
                        A ferramenta definitiva para gestão de tráfego, mais completa do mercado!
                    </h2>
                    <p className="text-[#6b7fa0] text-center mb-16 max-w-xl text-lg">Tudo que você precisa para criar, publicar e analisar campanhas — em um só lugar.</p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
                        {featuresClara.map((f, i) => (
                            <div key={i} className="feature-card flex flex-col">
                                <div className="diamond-icon">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l10 6.5v7L12 22 2 15.5v-7L12 2z" /></svg>
                                </div>
                                <h3 className="font-bold text-lg mb-2">{f.t}</h3>
                                <p className="text-gray-500 text-[14px] leading-relaxed">{f.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SEÇÃO 5 - Showcase */}
            <section className="bg-light-section py-16 px-4 sm:px-6 border-t border-blue-100/50">
                <div className="w-full max-w-6xl mx-auto flex flex-col items-center showFromBottom">
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 w-full mb-16">
                        {dashboards.map((d, i) => (
                            <div key={i} className="bg-white rounded-[20px] p-4 border border-gray-100 shadow-xl overflow-hidden group cursor-pointer hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-full aspect-video bg-gradient-to-br from-[#eef4ff] to-[#dde8ff] rounded-[12px] mb-6 overflow-hidden flex items-center justify-center">
                                    <div className="text-blue-200 font-mont font-bold text-sm">Preview</div>
                                </div>
                                <div className="px-2 pb-4">
                                    <div className="text-[11px] font-bold text-[#8cb528] tracking-widest mb-2">{d.tags}</div>
                                    <h3 className="font-bold text-xl text-slate-900">{d.t}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="cta-button">
                        Quero criar minha campanha agora
                        <span className="arrow-box">
                            <ArrowUpRight size={18} />
                        </span>
                    </button>
                </div>
            </section>

            {/* SEÇÃO 6 - Ticker 2 Light */}
            <div className="ticker-strip ticker-light z-20 relative border-y border-blue-100/50">
                <div className="ticker-content">
                    {[...Array(6)].map((_, i) => (
                        <span key={i} className="ticker-item opacity-40 text-[#071627]">
                            {tickerText}
                        </span>
                    ))}
                </div>
            </div>

            {/* SEÇÃO 7 - Comparação */}
            <section className="bg-light-section py-24 px-4 sm:px-6 relative">
                <div className="max-w-5xl mx-auto w-full flex flex-col items-center showFromBottom">
                    <div className="badge-pill !border-gray-200 !text-[#8cb528] mb-6 bg-white shadow-sm">DIFERENCIAL</div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4">Por que escolher a DashCortex?</h2>
                    <p className="text-[#6b7fa0] text-center mb-16 max-w-lg">A única plataforma com IA integrada para criar, publicar e analisar campanhas Meta e Google.</p>

                    <div className="comparison-wrapper w-full">
                        <div className="comparison-table grid grid-cols-3 w-full max-w-4xl mx-auto font-mont rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
                            {/* Critérios */}
                            <div className="bg-gray-50 p-6 font-bold flex flex-col gap-5 pt-24 border-r border-gray-100 text-base">
                                {['Design', 'Integração Meta', 'IA para criação', 'Conectores', 'Suporte'].map(c => (
                                    <div key={c} className="h-10 flex items-center text-gray-700">{c}</div>
                                ))}
                            </div>

                            <div className="bg-white p-6 flex flex-col gap-5 items-center text-center border-r border-gray-100 pt-10">
                                <div className="font-bold text-red-500 mb-5 py-2 px-4 rounded-full bg-red-50 w-full text-sm">Outras soluções</div>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-10 flex items-center justify-center">
                                        <X size={22} className="text-red-400" />
                                    </div>
                                ))}
                            </div>

                            <div className="bg-[#030b14] p-6 flex flex-col gap-5 items-center text-center border-2 border-[#b4f13d] shadow-[0_0_30px_rgba(180,241,61,0.25)] z-10 scale-[1.02] -ml-1 rounded-r-3xl rounded-l-lg relative pt-10 pb-10">
                                <div className="absolute inset-0 bg-[#b4f13d]/4 z-0 rounded-r-3xl rounded-l-lg"></div>
                                <div className="font-bold text-[#071627] mb-5 py-2 px-4 z-10 bg-[#b4f13d] rounded-full w-full text-sm shadow-[0_0_16px_rgba(180,241,61,0.5)]">DashCortex</div>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="h-10 flex items-center justify-center z-10">
                                        <CheckCircle2 size={26} className="text-[#b4f13d] drop-shadow-[0_0_8px_rgba(180,241,61,0.6)]" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-16">
                        <button className="cta-button">
                            Quero criar minha campanha agora
                            <span className="arrow-box">
                                <ArrowUpRight size={18} />
                            </span>
                        </button>
                    </div>
                </div>
            </section>

            {/* SEÇÃO 8 - Para Quem É */}
            <section className="bg-dark-section py-24 px-4 sm:px-6 relative z-10 border-t border-white/[0.04]">
                <div className="pattern-bg opacity-20"></div>
                <div className="max-w-6xl mx-auto w-full relative z-10 flex flex-col items-center showFromBottom">
                    <div className="badge-pill mb-4">IDEAL PARA VOCÊ!</div>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-center max-w-2xl">Feita sob medida para quem vive (ou depende) de tráfego</h2>
                    <p className="text-[#8aa4c8] text-center mb-16 max-w-lg">Independente do seu perfil, a DashCortex acelera seus resultados.</p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
                        {personas.map((p, i) => (
                            <div key={i} className="lp-neon-card bg-[rgba(5,15,30,0.6)] border border-[#b4f13d]/15 p-7 rounded-2xl hover:border-[#b4f13d]/50 hover:bg-[rgba(5,15,30,0.8)] transition-all duration-300 group">
                                <div className="w-11 h-11 bg-[#b4f13d]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#b4f13d]/20 transition-colors">
                                    {p.icon}
                                </div>
                                <h3 className="font-bold text-lg mb-3">{p.t}</h3>
                                <p className="text-[#8aa4c8] text-sm leading-relaxed">{p.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SEÇÃO 9 - Funcionalidades com Imagens */}
            <section className="bg-dark-section py-24 px-4 sm:px-6 border-t border-white/[0.02]">
                <div className="max-w-6xl mx-auto flex flex-col items-center showFromBottom">
                    <div className="badge-pill mb-6">FEATURES</div>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-center">Algumas Funcionalidades</h2>
                    <p className="text-[#8aa4c8] text-center mb-16 max-w-lg">Tudo que você precisa para dominar o tráfego pago dos seus clientes.</p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7 w-full">
                        {[
                            { t: "Funil de Tráfego", d: "Acompanhe cada etapa do funil com dados em tempo real." },
                            { t: "Análise de Criativos", d: "Veja quais anúncios performam melhor e por quê." },
                            { t: "Criação com IA", d: "Gere campanhas completas com segmentação e copy em segundos." },
                            { t: "Análise de Orçamento", d: "Distribua verba entre campanhas com máxima eficiência." },
                            { t: "Perfil do Público", d: "Entenda quem converte e refine sua segmentação." },
                            { t: "Gestão Multi-conta", d: "Centralize todos os clientes em um único painel." }
                        ].map((feat, i) => (
                            <div key={i} className="lp-neon-card bg-[#050f1e] rounded-[20px] pb-6 border border-white/[0.07] shadow-xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 group">
                                <div className="w-full aspect-video flex items-center justify-center pt-8 px-8 overflow-hidden mb-6 relative bg-gradient-to-b from-[#b4f13d]/5 to-transparent">
                                    <div className="w-full h-full bg-[#071627] rounded-t-xl border-t border-x border-[#b4f13d]/20 shadow-[0_0_30px_rgba(180,241,61,0.08)] flex items-center justify-center">
                                        <div className="text-[#8aa4c8]/40 text-xs font-bold">Preview</div>
                                    </div>
                                </div>
                                <div className="px-6 text-center">
                                    <h3 className="font-bold text-lg mb-2 text-white">{feat.t}</h3>
                                    <p className="text-[#8aa4c8] text-sm leading-relaxed">{feat.d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SEÇÃO 10 - Depoimentos */}
            <section className="bg-dark-section py-24 px-4 sm:px-6 relative border-t border-white/[0.04]">
                <div className="max-w-6xl mx-auto flex flex-col items-center showFromBottom">
                    <div className="badge-pill mb-6">DEPOIMENTOS</div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-center">O que dizem os clientes da DashCortex™</h2>
                    <p className="text-[#8aa4c8] text-center mb-16 max-w-lg">Resultados reais de gestores e agências que já usam a plataforma.</p>

                    <div className="grid sm:grid-cols-3 gap-6 w-full mb-20 max-w-4xl">
                        {[1, 2, 3].map((v) => (
                            <div key={`vid-${v}`} className="w-full aspect-[9/16] bg-[#050f1e] rounded-3xl border border-[#b4f13d]/15 shadow-[0_0_40px_rgba(180,241,61,0.08)] relative overflow-hidden flex flex-col items-center justify-center cursor-pointer group hover:border-[#b4f13d]/40 transition-all duration-300">
                                <div className="w-16 h-16 bg-[#b4f13d] rounded-full flex items-center justify-center pl-1 shadow-[0_0_24px_rgba(180,241,61,0.5)] group-hover:scale-110 transition-transform duration-300 z-10">
                                    <Play size={24} fill="#071627" color="#071627" />
                                </div>
                                <p className="mt-4 text-[#8aa4c8] text-xs font-semibold">Clique para ver</p>
                            </div>
                        ))}
                    </div>

                    <div className="w-full overflow-x-auto pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <div className="flex gap-5 w-max px-2 snap-x">
                            {[
                                { q: "As reuniões de fechamento ficaram 10x mais rápidas. Mostrar o DashCortex ao vivo fecha contratos maiores — só mostrei o dash e fechei R$4k de mensalidade.", n: "Lucas M.", c: "Gestor de Tráfego" },
                                { q: "Economizo pelo menos 6 horas por semana que eu passava montando relatório no Canva. Agora entrego pro cliente em 2 cliques e pareço muito mais profissional.", n: "Camila R.", c: "Dono de Agência" },
                                { q: "Eu duvidava que IA conseguia criar campanha de verdade. Testei e a estrutura que ela gerou era melhor do que o que eu faria manualmente.", n: "Rafael S.", c: "Media Buyer" },
                                { q: "Meus clientes ficaram impressionados com a qualidade dos dashboards. White label completo, coloco minha logo e entrego como se fosse meu sistema.", n: "Fernanda L.", c: "Estrategista Digital" },
                                { q: "Integração com Meta funcionou de primeira, sem complicação nenhuma. A IA já sugeriu os públicos certos para o meu nicho.", n: "André P.", c: "Infoprodutor" },
                                { q: "Nunca vi plataforma de gestão que seja ao mesmo tempo completa e tão fácil de usar. Recomendo para qualquer gestor que leva tráfego a sério.", n: "Juliana T.", c: "Consultora de Marketing" }
                            ].map((item, i) => (
                                <div key={i} className="lp-neon-card w-[320px] sm:w-[360px] snap-center bg-[#050f1e] border border-[rgba(60,80,110,0.8)] p-7 rounded-2xl flex-shrink-0 relative hover:border-[#b4f13d]/30 transition-colors duration-300">
                                    <div className="text-5xl text-[#b4f13d]/15 absolute top-4 right-6 font-serif leading-none">"</div>
                                    <p className="text-[#8aa4c8] mb-7 text-[14px] italic relative z-10 leading-relaxed">
                                        {item.q}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-full bg-[#b4f13d]/15 border border-[#b4f13d]/30 flex-shrink-0"></div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{item.n}</h4>
                                            <span className="text-xs text-[#b4f13d]">{item.c}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* SEÇÃO 11 - Preços */}
            <section id="prec" className="bg-dark-section py-32 px-4 sm:px-6 relative border-t border-white/[0.04]">
                <div className="max-w-5xl flex flex-col items-center mx-auto showFromBottom">
                    <div className="badge-pill mb-6">OFERTA DASHCORTEX ✨</div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-4 max-w-2xl">
                        Tenha acesso à ferramenta definitiva ainda hoje
                    </h2>
                    <p className="text-[#8aa4c8] text-center mb-20 max-w-md">Garantia de 7 dias — sem riscos. Comece agora.</p>

                    <div className="grid md:grid-cols-2 gap-7 w-full max-w-4xl relative">
                        {/* Básico */}
                        <div className="price-card basic border flex flex-col justify-between">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Pacote Básico</h3>
                                <p className="opacity-60 text-sm mb-8 font-mont">Para quem está começando</p>

                                <div className="mb-8">
                                    <span className="text-base opacity-50 line-through mr-2">De R$ 147</span>
                                    <div className="text-[#071627] text-5xl font-extrabold font-mont tracking-tighter flex items-baseline mt-1">
                                        <span className="text-xl mr-1 mb-1">R$</span>6,95<span className="text-base ml-1 font-normal opacity-50">/mês*</span>
                                    </div>
                                    <p className="text-sm opacity-60 mt-1">ou R$ 67,90 à vista</p>
                                </div>

                                <ul className="space-y-3 mb-8 font-mont text-sm font-semibold">
                                    <li className="flex items-center gap-2.5"><CheckCircle2 className="text-green-600 flex-shrink-0" size={17} /> Acesso aos dashboards</li>
                                    <li className="flex items-center gap-2.5"><CheckCircle2 className="text-green-600 flex-shrink-0" size={17} /> Criação de campanhas com IA</li>
                                    <li className="flex items-center gap-2.5 opacity-40"><X className="text-red-500 flex-shrink-0" size={17} /> Sem white label</li>
                                    <li className="flex items-center gap-2.5 opacity-40"><X className="text-red-500 flex-shrink-0" size={17} /> Limite de 3 contas</li>
                                </ul>
                            </div>

                            <button className="cta-button w-full !bg-[#071627] !text-[#b4f13d] hover:!bg-[#0a1a2e] border-2 border-[#b4f13d] !shadow-none hover:!shadow-[0_0_20px_rgba(180,241,61,0.3)]">
                                Comprar agora
                                <span className="arrow-box !bg-[#b4f13d]/15">
                                    <ArrowUpRight size={18} />
                                </span>
                            </button>
                        </div>

                        {/* Pro */}
                        <div className="price-card pro flex flex-col justify-between">
                            <div className="ribbon">MAIS POPULAR</div>
                            <div>
                                <h3 className="text-2xl font-bold mb-1">Pacote Completo</h3>
                                <p className="text-[#8aa4c8] text-sm mb-8 font-mont">Para agências e gestores premium</p>

                                <div className="mb-8">
                                    <span className="text-base opacity-50 line-through mr-2">De R$ 297</span>
                                    <div className="green-anim text-5xl font-extrabold font-mont tracking-tighter inline-flex items-baseline mt-1">
                                        <span className="text-xl mr-1">R$</span>9,94<span className="text-base ml-1 font-normal opacity-50 text-white">/mês*</span>
                                    </div>
                                    <p className="text-sm opacity-60 mt-1">ou R$ 97,00 à vista</p>
                                </div>

                                <ul className="space-y-3 mb-8 font-mont text-sm font-semibold">
                                    <li className="flex items-center gap-2.5"><CheckCircle2 className="text-[#b4f13d] flex-shrink-0" size={17} /> Dashboards Premium Ilimitados</li>
                                    <li className="flex items-center gap-2.5"><CheckCircle2 className="text-[#b4f13d] flex-shrink-0" size={17} /> Criação de campanhas com IA</li>
                                    <li className="flex items-center gap-2.5"><CheckCircle2 className="text-[#b4f13d] flex-shrink-0" size={17} /> White Label (Sua logo)</li>
                                    <li className="flex items-center gap-2.5"><CheckCircle2 className="text-[#b4f13d] flex-shrink-0" size={17} /> Suporte Prioritário VIP</li>
                                </ul>
                            </div>

                            <button className="cta-button w-full shadow-[0_0_24px_rgba(180,241,61,0.35)]">
                                Comprar agora
                                <span className="arrow-box">
                                    <ArrowUpRight size={18} />
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEÇÃO 12 - Integrações Seguras */}
            <section className="bg-light-section py-24 px-4 sm:px-6 border-t border-gray-200">
                <div className="max-w-5xl mx-auto flex flex-col items-center showFromBottom text-center">
                    <div className="badge-pill !border-gray-200 !text-[#8cb528] mb-6 bg-white shadow-sm">SEGURANÇA</div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Integrações seguras com <br className="hidden sm:block" />conectores parceiros da Meta</h2>
                    <p className="text-[#6b7fa0] mb-12 max-w-lg text-lg">API oficial, dados criptografados e parceria verificada Meta Business.</p>

                    <div className="w-full max-w-4xl aspect-[21/9] bg-white rounded-[32px] border border-gray-200 shadow-[0_30px_60px_rgba(0,0,0,0.06)] mb-12 flex items-center justify-center relative overflow-hidden group hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] transition-shadow">
                        <div className="text-gray-200 font-bold text-xl group-hover:scale-105 transition-transform font-mont">[Conectores Meta / Google]</div>
                    </div>

                    <button className="cta-button">
                        Quero criar minha campanha agora
                        <span className="arrow-box">
                            <ArrowUpRight size={18} />
                        </span>
                    </button>
                </div>
            </section>

            {/* SEÇÃO 13 - Garantia */}
            <section className="bg-dark-section py-24 px-4 sm:px-6 relative border-t border-white/[0.04]">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center showFromBottom">
                    <div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                            Risco zero para você. <br />
                            <span className="blue-anim block mt-3">Tome sua decisão hoje!</span>
                        </h2>
                        <p className="text-lg text-[#8aa4c8] font-mont leading-relaxed mb-8">
                            Confiamos tanto na qualidade e facilidade da DashCortex que se você não gostar, devolveremos <b className="text-white">100% do seu dinheiro</b>. Sem burocracia, basta um clique.
                        </p>
                        <button className="cta-glass font-mont flex items-center gap-2">
                            Estou pronto para adquirir <ArrowUpRight size={16} />
                        </button>
                    </div>
                    <div className="flex justify-center md:justify-end relative">
                        <div className="w-[280px] h-[280px] bg-[#b4f13d] rounded-full blur-[100px] absolute z-0 opacity-30 mix-blend-screen"></div>
                        <div className="w-52 h-52 rounded-full border-[8px] border-[#b4f13d] bg-[#050f1e] flex flex-col items-center justify-center text-center p-4 z-10 shadow-[0_0_60px_rgba(180,241,61,0.35)]">
                            <span className="text-5xl font-extrabold font-mont leading-none">7</span>
                            <span className="text-sm font-bold mt-1">DIAS</span>
                            <span className="text-[10px] font-bold opacity-70 uppercase tracking-[0.15em] text-center mt-2 px-2 text-[#d1fb78]">Dinheiro de volta</span>
                            <div className="flex gap-1 mt-3 text-[#b4f13d]">
                                {[1, 2, 3, 4, 5].map(i => <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEÇÃO 14 - Sobre o Fundador */}
            <section className="bg-dark-section py-24 px-4 sm:px-6 relative border-t border-white/[0.04] overflow-hidden">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center showFromBottom z-10 relative">
                    <div className="order-2 md:order-1 flex justify-center">
                        <div className="w-full max-w-[380px] aspect-[4/5] bg-gradient-to-tr from-[#050f1e] to-[#071627] border border-[#b4f13d]/20 rounded-3xl relative overflow-hidden flex items-end justify-center shadow-[0_0_60px_rgba(180,241,61,0.1)] group hover:-translate-y-2 transition-transform duration-500">
                            <div className="text-[#8aa4c8]/60 font-bold mb-20 z-10 text-sm font-mont">[Foto Lucas]</div>
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#050f1e] to-transparent z-0"></div>
                        </div>
                    </div>
                    <div className="order-1 md:order-2">
                        <div className="badge-pill mb-6">SOBRE O CRIADOR</div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-8">
                            Prazer, <span className="blue-anim">Lucas</span>
                        </h2>
                        <p className="text-[#8aa4c8] font-mont leading-relaxed mb-5 text-lg">
                            Especialista em tráfego pago e análise de dados. Ajudei centenas de gestores e agências a ganhar clareza sobre suas campanhas através de dashboards e automações.
                        </p>
                        <p className="text-[#8aa4c8] font-mont leading-relaxed text-lg">
                            A DashCortex nasceu de uma dor real: perder horas no gerenciador de anúncios sem conseguir transformar dados em decisões rápidas e <b className="text-white">relatórios que fecham contratos</b>.
                        </p>
                    </div>
                </div>
            </section>

            {/* SEÇÃO 15 - FAQ */}
            <section className="bg-dark-section py-24 px-4 sm:px-6 border-t border-white/[0.04] relative z-10">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 showFromBottom">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Perguntas Frequentes</h2>
                        <p className="text-[#8aa4c8] mb-10 text-lg leading-relaxed">Tire suas dúvidas antes de começar.</p>
                        <div className="bg-gradient-to-br from-[#1a0530]/80 to-[#2d0a4a]/60 p-8 rounded-3xl border border-purple-500/20 shadow-[0_0_40px_rgba(180,0,255,0.04)] backdrop-blur-md w-full max-w-[380px]">
                            <h3 className="font-bold text-xl mb-3">Ainda ficou com alguma dúvida?</h3>
                            <p className="text-[#8aa4c8] text-sm mb-6 leading-relaxed font-mont">Nossa equipe de suporte está pronta para ajudar você.</p>
                            <button className="bg-white text-[#071627] font-bold py-3 px-6 rounded-full hover:bg-[#f0f6ff] transition-colors w-full flex justify-center items-center gap-2 text-sm">
                                Fale conosco <ArrowUpRight size={15} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 font-mont">
                        {faq.map((item, i) => (
                            <div
                                key={i}
                                className={`faq-item cursor-pointer select-none ${openFaq === i ? 'active' : ''}`}
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            >
                                <div className="faq-header">
                                    <span>{item.q}</span>
                                    <span
                                        className="text-[#b4f13d] bg-[#b4f13d]/10 p-1 rounded-full flex-shrink-0 transition-transform duration-300"
                                        style={{ rotate: openFaq === i ? '45deg' : '0deg' }}
                                    >
                                        <Plus size={17} strokeWidth={3} />
                                    </span>
                                </div>
                                {openFaq === i && (
                                    <div className="faq-content">{item.a}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SEÇÃO 16 - Footer */}
            <footer className="bg-black py-14 px-4 sm:px-6 border-t border-white/[0.02]">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <Image src="/favicon.svg" alt="DashCortex" width={34} height={34} className="invert brightness-0 invert" />
                        <span className="font-bold text-2xl tracking-tighter text-white font-mont">DashCortex™</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40 font-semibold font-mont">
                        <a href="#" className="hover:text-white/80 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white/80 transition-colors">Terms</a>
                        <a href="#" className="hover:text-white/80 transition-colors">Cookies</a>
                    </div>
                    <div className="text-sm text-white/30 font-mont">
                        © 2024-2025 DashCortex. Todos os direitos reservados.
                    </div>
                </div>
            </footer>
        </div>
    );
}
