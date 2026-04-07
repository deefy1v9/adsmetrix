"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MetaAdAccount } from "@/lib/meta-api";
import { fetchAdAccountsAction } from "@/actions/meta-actions";
import { useUser } from "@/components/providers/UserContext";

interface AccountContextType {
    accounts: MetaAdAccount[];
    selectedAccount: MetaAdAccount | null;
    setSelectedAccount: (account: MetaAdAccount) => void;
    isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
    const user = useUser();
    const [accounts, setAccounts]               = useState<MetaAdAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<MetaAdAccount | null>(null);
    const [isLoading, setIsLoading]             = useState(true);

    useEffect(() => {
        async function loadAccounts() {
            try {
                const data = await fetchAdAccountsAction();

                // Filter accounts if user has a restricted list
                const allowed = user?.allowed_account_ids;
                const filtered = allowed
                    ? data.filter(a => allowed.includes(a.id) || allowed.includes(a.account_id ?? ""))
                    : data;

                setAccounts(filtered);

                // Restore from localStorage or default to first visible account
                const storedId = localStorage.getItem("selectedAccountId");
                const found = filtered.find(a => a.id === storedId) || filtered[0];
                if (found) setSelectedAccount(found);
            } catch (error) {
                console.error("Failed to load accounts", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadAccounts();
    // Re-run if user permissions change
    }, [user?.allowed_account_ids?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSetSelectedAccount = (account: MetaAdAccount) => {
        setSelectedAccount(account);
        localStorage.setItem("selectedAccountId", account.id);
    };

    return (
        <AccountContext.Provider value={{
            accounts,
            selectedAccount,
            setSelectedAccount: handleSetSelectedAccount,
            isLoading,
        }}>
            {children}
        </AccountContext.Provider>
    );
}

export function useAccount() {
    const context = useContext(AccountContext);
    if (context === undefined) {
        throw new Error("useAccount must be used within an AccountProvider");
    }
    return context;
}
