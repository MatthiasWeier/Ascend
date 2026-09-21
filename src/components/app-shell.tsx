"use client";

import Link from "next/link";
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
  PersonStanding,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useT } from "@/components/locale-provider";
import { LegalFooter } from "@/components/legal-footer";
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

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <Mountain className="size-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">Ascend</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="size-4" />
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
        {isAdmin && (
          <Link
            href="/dashboard/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/dashboard/admin"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <ShieldCheck className="size-4" />
            Admin
          </Link>
        )}
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className="size-4" />
          {t("Einstellungen")}
        </Link>
        <LegalFooter className="mt-4 px-3" />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
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
