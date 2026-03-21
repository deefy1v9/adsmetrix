import { TrafficManagerUI } from "@/components/features/gestor-trafego/TrafficManagerUI";
import { Button } from "@/components/ui/Button";
import { Sparkles } from "lucide-react";

export default function GestorTrafegoPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestor de Tráfego AI</h2>
                    <p className="text-muted-foreground">Estratégia avançada, criação e otimização de campanhas utilizando inteligência artificial.</p>
                </div>
                <Button>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Nova Estratégia
                </Button>
            </div>

            <TrafficManagerUI />
        </div>
    );
}
