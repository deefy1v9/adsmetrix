import { TrafficManagerUI } from "@/components/features/gestor-trafego/TrafficManagerUI";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sparkles } from "lucide-react";

export default function GestorTrafegoPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Automação"
                title="Gestor de Tráfego"
                icon={Sparkles}
                description="Estratégia avançada, criação e otimização de campanhas utilizando inteligência artificial."
                actions={
                    <Button>
                        <Sparkles className="h-4 w-4" />
                        Nova Estratégia
                    </Button>
                }
            />

            <TrafficManagerUI />
        </div>
    );
}
