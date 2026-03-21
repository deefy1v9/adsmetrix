import { LeadsList } from "@/components/features/leads/LeadsList";

export default function LeadsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Gerenciamento de Leads</h2>
                <p className="text-muted-foreground">Visualize e gerencie todos os leads capturados.</p>
            </div>

            <LeadsList />
        </div>
    );
}
