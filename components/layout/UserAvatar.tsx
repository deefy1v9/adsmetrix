import { getSession } from "@/lib/auth";

export async function UserAvatar() {
    const user = await getSession();

    const initials = user?.name
        ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
        : user?.email?.substring(0, 2).toUpperCase() || "?";

    return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-sm shadow-sm ring-2 ring-primary/20">
            {initials}
        </div>
    );
}
