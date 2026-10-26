import { cn } from "@/lib/utils";

type IconProps = { className?: string };

/** Google Ads mark (simplified, brand colors). */
export function GoogleAdsIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden="true">
            <line x1="12.4" y1="5" x2="19" y2="16.6" stroke="#4285F4" strokeWidth="5" strokeLinecap="round" />
            <line x1="11.6" y1="5" x2="5" y2="16.6" stroke="#FBBC04" strokeWidth="5" strokeLinecap="round" />
            <circle cx="5" cy="17.2" r="2.8" fill="#34A853" />
        </svg>
    );
}

/** Meta mark (simplified infinity loop, brand blue). */
export function MetaIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden="true">
            <path
                d="M3 14.6c0-3.7 1.8-7.3 4.1-7.3 1.8 0 3.1 2 4.9 5.1 1.8 3.1 3 4.9 4.8 4.9 1.6 0 2.7-1.4 2.7-3.7 0-3.5-1.8-6.3-3.8-6.3-1.6 0-2.9 1.6-4.4 4.2l-1.6 2.8c-1.3 2.2-2.2 3-3.5 3C4.1 17.3 3 16.3 3 14.6Z"
                fill="none"
                stroke="#0866FF"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

/** Claude spark mark (brand terracotta). */
export function ClaudeIcon({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden="true">
            <g stroke="#D97757" strokeWidth="2.6" strokeLinecap="round">
                <line x1="12" y1="3" x2="12" y2="21" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
                <line x1="18.4" y1="5.6" x2="5.6" y2="18.4" />
            </g>
        </svg>
    );
}
