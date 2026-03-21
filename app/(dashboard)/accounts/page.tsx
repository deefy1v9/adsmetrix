import { AccountsList } from "@/components/features/accounts/AccountsList";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

export default function AccountsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Contas de Anúncios</h2>
                    <p className="text-muted-foreground">Visualize e gerencie as contas de anúncios conectadas do Facebook Ads.</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Conta
                </Button>
            </div>

            <AccountsList />
        </div>
    );
}
