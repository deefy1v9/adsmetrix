import { AccountProvider } from "@/components/providers/AccountContext";
import { DateProvider } from "@/components/providers/DateContext";
import { SidebarProvider } from "@/components/providers/SidebarContext";
import { UserProvider } from "@/components/providers/UserContext";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getSession();

    return (
        <UserProvider user={user}>
            <SidebarProvider>
                <AccountProvider>
                    <DateProvider>
                        <LayoutWrapper>
                            {children}
                        </LayoutWrapper>
                    </DateProvider>
                </AccountProvider>
            </SidebarProvider>
        </UserProvider>
    );
}
