import { AccountsList } from "@/components/features/accounts/AccountsList";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Plus, Users } from "lucide-react";

export default function AccountsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Canais"
                title="Contas"
                icon={Users}
                description="Visualize e gerencie as contas de anúncios conectadas do Facebook Ads."
                actions={
                    <Button>
                        <Plus className="h-4 w-4" />
                        Nova Conta
                    </Button>
                }
            />

            <AccountsList />
        </div>
    );
}
