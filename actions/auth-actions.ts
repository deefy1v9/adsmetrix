"use server";

import { authenticate, createSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

/** Only same-origin paths — never "//evil.com" or "/\evil.com", which browsers treat as external. */
function safeNextPath(next: FormDataEntryValue | null): string {
    if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
    return next;
}

export async function loginAction(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "E-mail e senha são obrigatórios." };
    }

    const user = await authenticate(email, password);
    if (!user) {
        return { error: "E-mail ou senha inválidos." };
    }

    await createSession(user.id, (user as any).role, (user as any).workspace_id, (user as any).is_super_admin);
    redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction() {
    await destroySession();
    redirect("/login");
}
