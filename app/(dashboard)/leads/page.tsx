import { Users } from "lucide-react";
import { LeadsList } from "@/components/features/leads/LeadsList";
import { PageHeader } from "@/components/ui/PageHeader";

export default function LeadsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Análise"
                title="Leads"
                icon={Users}
                description="Visualize e gerencie todos os leads capturados pelas campanhas."
            />

            <LeadsList />
        </div>
    );
}
