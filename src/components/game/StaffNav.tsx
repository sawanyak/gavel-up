"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { LogOut } from "lucide-react";
import { api } from "@/lib/client/api";

const GM_LINKS = [
  { href: "/gm", label: "Dashboard" },
  { href: "/gm/setup", label: "Teams & Staff" },
  { href: "/gm/qr", label: "Registration QR" },
  { href: "/tm", label: "TM View" },
];

export function StaffNav({ role, name }: { role: "GM" | "TM"; name?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = role === "GM" ? GM_LINKS : [{ href: "/tm", label: "My Team" }];

  const logout = async () => {
    await api("/api/staff/logout", { method: "POST" });
    router.replace("/staff/login");
  };

  return (
    <nav className="flex flex-wrap items-center gap-2 mb-5">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={clsx(
            "px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border",
            pathname === l.href
              ? "bg-cyan-500/15 text-cyan-200 border-cyan-400/60"
              : "text-slate-300 border-slate-700 hover:text-white hover:border-slate-500",
          )}
        >
          {l.label}
        </Link>
      ))}
      <span className="flex-grow" />
      {name && (
        <span className="text-xs font-mono text-slate-400">
          {role} · {name}
        </span>
      )}
      <button
        onClick={logout}
        className="px-3 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border border-slate-700 text-slate-300 hover:text-red-300 hover:border-red-500/60 inline-flex items-center gap-1.5"
      >
        <LogOut className="w-3.5 h-3.5" /> Log out
      </button>
    </nav>
  );
}
