import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
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
        <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/3 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-sm mx-auto px-6 py-10">
                <div className="flex flex-col items-center mb-10">
                    <h1 className="text-2xl font-black text-white tracking-tight">Aceitar convite</h1>
                    <p className="text-sm text-white/40 mt-1 font-medium">
                        Você foi convidado para{" "}
                        <span className="text-primary font-semibold">{invite.workspace.nome_empresa}</span>
                    </p>
                    <p className="text-xs text-white/30 mt-2">{invite.email}</p>
                </div>

                <InviteForm token={token} email={invite.email} />
            </div>
        </div>
    );
}
