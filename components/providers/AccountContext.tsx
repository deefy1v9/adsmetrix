"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MetaAdAccount } from "@/lib/meta-api";
import { fetchAdAccountsAction } from "@/actions/meta-actions";

interface AccountContextType {
    accounts: MetaAdAccount[];
    selectedAccount: MetaAdAccount | null;
    setSelectedAccount: (account: MetaAdAccount) => void;
    isLoading: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
    const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<MetaAdAccount | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadAccounts() {
            try {
                const data = await fetchAdAccountsAction();
                setAccounts(data);

                // Try to restore from localStorage or default to first
                const storedId = localStorage.getItem("selectedAccountId");
                const found = data.find(a => a.id === storedId) || data[0];

                if (found) {
                    setSelectedAccount(found);
                }
            } catch (error) {
                console.error("Failed to load accounts", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadAccounts();
    }, []);

    const handleSetSelectedAccount = (account: MetaAdAccount) => {
        setSelectedAccount(account);
        localStorage.setItem("selectedAccountId", account.id);
    };

    return (
        <AccountContext.Provider value={{
            accounts,
            selectedAccount,
            setSelectedAccount: handleSetSelectedAccount,
            isLoading
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
