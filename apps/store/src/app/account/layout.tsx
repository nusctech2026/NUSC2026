import type { Metadata } from "next";
import { AccountSidebar } from "@/components/account-sidebar";
import { LogOut } from "lucide-react";
import Link from "next/link";
import "./account.css";

export const metadata: Metadata = {
  title: "My Account | NUSC",
  description: "Manage your NUSC account, orders, and preferences.",
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="account-page-wrapper">
      <div className="account-container">
        {/* Sidebar */}
        <AccountSidebar />
        
        {/* Main Content */}
        <div className="account-content">
          {children}
        </div>
        
        {/* Mobile Logout (Hidden on Desktop) */}
        <div className="mobile-logout-wrapper">
          <Link href="/logout" className="mobile-logout-link">
            <LogOut size={16} /> Log Out
          </Link>
        </div>
      </div>
    </div>
  );
}
