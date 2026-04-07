"use client";

import { createContext, useContext } from "react";

export interface UserData {
    id: string;
    email: string;
    name: string | null;
    role: string;
    workspace_id: string | null;
    is_super_admin: boolean;
    allowed_tabs: string[] | null;         // null = all tabs allowed
    allowed_account_ids: string[] | null;  // null = all accounts allowed
}

const UserContext = createContext<UserData | null>(null);

export function UserProvider({ user, children }: { user: UserData | null; children: React.ReactNode }) {
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
    return useContext(UserContext);
}
