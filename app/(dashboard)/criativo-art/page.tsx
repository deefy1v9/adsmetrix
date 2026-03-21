"use client";

import { useState } from "react";
import { CriativoArtUI } from "@/components/features/criativo-art/CriativoArtUI";
import { Sparkles, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CriativoArtPage() {
    const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="text-primary">Criativo</span>
                            <span className="text-foreground">.</span>
                            <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-2xl leading-none">Art</span>
                        </span>
                    </h2>
                    <p className="text-muted-foreground">Gere criativos profissionais para anúncios com inteligência artificial.</p>
                </div>
                <div className="flex items-center gap-2">
                    {creditsBalance !== null && (
                        <span className={cn(
                            "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border",
                            creditsBalance > 10
                                ? "bg-green-500/10 text-green-500 border-green-500/30"
                                : creditsBalance > 3
                                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                                : "bg-red-500/10 text-red-500 border-red-500/30"
                        )}>
                            <Coins className="h-3.5 w-3.5" />
                            {creditsBalance} crédito{creditsBalance !== 1 ? "s" : ""}
                        </span>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Powered by Atlas
                    </div>
                </div>
            </div>

            <CriativoArtUI onCreditsUpdate={setCreditsBalance} />
        </div>
    );
}
