"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Package, MapPin, Heart, LogOut, Gift } from "lucide-react";

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="account-sidebar">
      <div className="account-user-overview">
        <h2 className="account-greeting">Hi, John</h2>
        <div className="account-email">john@example.com</div>
      </div>
      
      <nav className="account-nav">
        <Link href="/account" className={`account-nav-link ${pathname === '/account' ? 'active' : ''}`}>
          <User size={18} /> Overview
        </Link>
        <Link href="/account/benefits" className={`account-nav-link ${pathname?.startsWith('/account/benefits') ? 'active' : ''}`}>
          <Gift size={18} /> Member Benefits
        </Link>
        <Link href="/account/orders" className={`account-nav-link ${pathname?.startsWith('/account/orders') ? 'active' : ''}`}>
          <Package size={18} /> My Orders
        </Link>
        <Link href="/account/wishlist" className={`account-nav-link ${pathname === '/account/wishlist' ? 'active' : ''}`}>
          <Heart size={18} /> Wishlist
        </Link>
        <Link href="/account/addresses" className={`account-nav-link ${pathname === '/account/addresses' ? 'active' : ''}`}>
          <MapPin size={18} /> Addresses
        </Link>
        <Link href="/account/profile" className={`account-nav-link ${pathname === '/account/profile' ? 'active' : ''}`}>
          <User size={18} /> Profile
        </Link>
        <Link href="/account/security" className={`account-nav-link ${pathname === '/account/security' ? 'active' : ''}`}>
          <User size={18} /> Password & Security
        </Link>
        
        <Link href="/logout" className="account-nav-link logout desktop-only-logout">
          <LogOut size={18} /> Log Out
        </Link>
      </nav>
    </aside>
  );
}
