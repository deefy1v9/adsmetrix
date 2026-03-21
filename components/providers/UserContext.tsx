"use client";

import { createContext, useContext } from "react";

interface UserData {
    id: string;
    email: string;
    name: string | null;
    role: string;
    workspace_id: string | null;
    is_super_admin: boolean;
}

const UserContext = createContext<UserData | null>(null);

export function UserProvider({ user, children }: { user: UserData | null; children: React.ReactNode }) {
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
    return useContext(UserContext);
}
