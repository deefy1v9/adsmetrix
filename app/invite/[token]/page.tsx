import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { BrandMark } from "@/components/ui/Logo";
import { APP_NAME } from "@/lib/brand";
import InviteForm from "./InviteForm";

export default async function InvitePage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    const invite = await prisma.invite.findUnique({
        where: { token },
        include: { workspace: true },
    });

    if (!invite || invite.expires_at < new Date()) {
        notFound();
    }

    return (
        <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
                        <BrandMark className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight">Aceitar convite</h1>
                <p className="mt-1.5 mb-8 text-sm text-muted-foreground">
                    Você foi convidado para{" "}
                    <span className="font-semibold text-foreground">{invite.workspace.nome_empresa}</span>.
                    Crie seu acesso para entrar no workspace.
                </p>

                <InviteForm token={token} email={invite.email} />
            </div>
        </main>
    );
}
