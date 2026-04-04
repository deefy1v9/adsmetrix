"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import NeuralBackground from "@/components/ui/flow-field-background";

export function GlobalBackground() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const isDark = resolvedTheme === "dark";

    return (
        <div className="fixed inset-0 -z-10 pointer-events-none">
            <NeuralBackground
                color={isDark ? "#ffffff" : "#000000"}
                trailColor={isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)"}
                trailOpacity={isDark ? 0.12 : 0.08}
                particleCount={500}
                speed={0.8}
            />
        </div>
    );
}
