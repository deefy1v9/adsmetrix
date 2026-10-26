import {
    LayoutDashboard,
    BarChart3,
    Users,
    TrendingUp,
    Zap,
    MessageSquare,
    ScrollText,
    Bell,
    Settings,
    Sparkles,
    Shield,
} from "lucide-react";
import { GoogleAdsIcon } from "@/components/ui/PlatformIcons";

export { APP_NAME } from "./brand";

export type NavGroup = "Análise" | "Canais" | "Automação" | "Sistema";

export interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    group: NavGroup;
    description: string;
    /** Header shows the Meta account picker on this page */
    usesMetaAccount?: boolean;
    /** Header shows the date range picker on this page */
    usesDateRange?: boolean;
    badge?: string;
}

export const NAV_GROUPS: NavGroup[] = ["Análise", "Canais", "Automação", "Sistema"];

export const NAV_ITEMS: NavItem[] = [
    { name: "Visão Geral",       href: "/overview",         icon: LayoutDashboard, group: "Análise",   description: "Consolidado de todas as contas" },
    { name: "Performance",       href: "/performance",      icon: TrendingUp,      group: "Análise",   description: "Custo por resultado por conta e anúncio" },
    { name: "Leads",             href: "/leads",            icon: Users,           group: "Análise",   description: "Leads capturados pelas campanhas", usesMetaAccount: true },
    { name: "Meta Ads",          href: "/",                 icon: BarChart3,       group: "Canais",    description: "Dashboard da conta Meta selecionada", usesMetaAccount: true, usesDateRange: true },
    { name: "Google Ads",        href: "/google-ads",       icon: GoogleAdsIcon,   group: "Canais",    description: "Campanhas e métricas do Google Ads", usesDateRange: true, badge: "Novo" },
    { name: "Gestor de Tráfego", href: "/gestor-trafego",   icon: Sparkles,        group: "Automação", description: "Estratégia e criação de campanhas com IA", usesMetaAccount: true },
    { name: "Automações",        href: "/automations",      icon: Zap,             group: "Automação", description: "Relatórios e disparos agendados" },
    { name: "WhatsApp",          href: "/whatsapp-reports", icon: MessageSquare,   group: "Automação", description: "Relatórios e conexão do WhatsApp", usesMetaAccount: true, usesDateRange: true },
    { name: "Notificações",      href: "/notifications",    icon: Bell,            group: "Sistema",   description: "Alertas e atividade recente" },
    { name: "Logs",              href: "/logs",             icon: ScrollText,      group: "Sistema",   description: "Histórico de envios de relatórios" },
    { name: "Integrações",       href: "/settings",         icon: Settings,        group: "Sistema",   description: "Meta, Google Ads, Claude (MCP) e WhatsApp" },
];

/** The only account that sees the admin page (admin actions enforce the same email server-side). */
export const ADMIN_EMAIL = "deefy07@gmail.com";

export const ADMIN_NAV_ITEM: NavItem = {
    name: "Admin", href: "/admin", icon: Shield, group: "Sistema", description: "Usuários e permissões",
};

/** Pages reachable but not listed in the sidebar */
const HIDDEN_ITEMS: NavItem[] = [
    { name: "Teste de WhatsApp", href: "/whatsapp-test", icon: MessageSquare, group: "Automação", description: "Envio de teste", usesMetaAccount: true, usesDateRange: true },
    { name: "Contas",            href: "/accounts",      icon: Users,         group: "Canais",    description: "Contas de anúncio" },
];

/** Finds the nav entry for a pathname ("/" only matches exactly; others match by prefix). */
export function findNavItem(pathname: string): NavItem | undefined {
    const all = [...NAV_ITEMS, ADMIN_NAV_ITEM, ...HIDDEN_ITEMS];
    if (pathname === "/") return all.find(i => i.href === "/");
    return all
        .filter(i => i.href !== "/" && (pathname === i.href || pathname.startsWith(i.href + "/")))
        .sort((a, b) => b.href.length - a.href.length)[0];
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(item.href + "/");
}

/**
 * allowed_tabs is stored as a list of hrefs. Pages not in NAV_ITEMS (admin, hidden helpers)
 * are governed elsewhere, so only listed tabs are checked here.
 */
export function isPathAllowed(pathname: string, allowedTabs: string[] | null | undefined): boolean {
    if (!allowedTabs) return true;
    const item = NAV_ITEMS.find(i => isNavItemActive(i, pathname));
    if (!item) return true;
    return allowedTabs.includes(item.href);
}
