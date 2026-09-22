"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Mountain,
  PanelLeftClose,
  PanelLeftOpen,
  PersonStanding,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useT } from "@/components/locale-provider";
import { LegalFooter } from "@/components/legal-footer";
import { InstallAppBanner } from "@/components/install-app";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/dashboard", label: "Feed", icon: LayoutDashboard },
  { href: "/dashboard/workouts/new", label: "Eintragen", icon: PlusCircle },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/body", label: "Körper", icon: PersonStanding },
  { href: "/dashboard/groups", label: "Gruppen", icon: Users },
];

const SIDEBAR_COLLAPSED_KEY = "ascend:sidebar-collapsed";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppShell({
  children,
  userName,
  avatarUrl,
  isAdmin,
}: {
  children: React.ReactNode;
  userName: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);

  // Read the saved preference after mount - keeps the server-rendered markup
  // (always expanded) matching the client's first render, so no hydration
  // warning, at the cost of one brief re-render if it was collapsed.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      collapsed && "justify-center px-0",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    );

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar - sticky to the viewport (not the page), so Admin/
          Einstellungen/Impressum stay reachable without scrolling even when
          the main content (e.g. a long feed) is much taller than the screen. */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-150 md:sticky md:top-0 md:flex md:h-dvh",
          collapsed ? "md:w-16" : "md:w-64"
        )}
      >
        <Link
          href="/"
          className={cn("flex items-center gap-2 px-4 py-6", collapsed && "justify-center px-2")}
          title="Ascend"
        >
          <Mountain className="size-6 shrink-0 text-primary" />
          {!collapsed && <span className="text-lg font-bold tracking-tight">Ascend</span>}
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {navItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? t(item.label) : undefined}
                className={linkClass(active)}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && t(item.label)}
              </Link>
            );
          })}
        </nav>

        {/* Pinned to the bottom of the sticky sidebar, always visible. */}
        <div className="shrink-0 px-3 pb-3">
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              title={collapsed ? "Admin" : undefined}
              className={linkClass(pathname === "/dashboard/admin")}
            >
              <ShieldCheck className="size-4 shrink-0" />
              {!collapsed && "Admin"}
            </Link>
          )}
          <Link
            href="/dashboard/settings"
            title={collapsed ? t("Einstellungen") : undefined}
            className={linkClass(pathname === "/dashboard/settings")}
          >
            <Settings className="size-4 shrink-0" />
            {!collapsed && t("Einstellungen")}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? t("Sidebar ausklappen") : t("Sidebar einklappen")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4 shrink-0" /> : <PanelLeftClose className="size-4 shrink-0" />}
            {!collapsed && t("Einklappen")}
          </button>
          {collapsed ? (
            <p className="mt-2 text-center text-[9px] text-muted-foreground">v{APP_VERSION}</p>
          ) : (
            <LegalFooter className="mt-3 px-3" />
          )}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <InstallAppBanner />
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:justify-end">
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <Mountain className="size-5 text-primary" />
            <span className="font-bold">Ascend</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <LanguageToggle />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <Avatar className="size-8 cursor-pointer">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials(userName)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{userName}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem render={<Link href="/dashboard/admin" />}>
                    <ShieldCheck className="size-4" />
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
                  <Settings className="size-4" />
                  {t("Einstellungen")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut({ redirectTo: "/" })}
                >
                  <LogOut className="size-4" />
                  {t("Abmelden")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur-md md:hidden">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="size-5" />
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
