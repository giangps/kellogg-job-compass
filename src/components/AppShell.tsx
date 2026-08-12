import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { SupportChatWidget } from "@/components/SupportChatWidget";

const baseNavItems = [
  { to: "/feed", label: "Feed" },
  { to: "/dashboard", label: "My applications" },
  { to: "/alumni", label: "Alumni network" },
  { to: "/preferences", label: "Preferences" },
  { to: "/profile", label: "My profile" },
  { to: "/contact", label: "Contact us" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const isAdminQuery = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", auth.user.id)
        .maybeSingle();
      // is_admin isn't in the generated types yet -- see apply_admin_flag.sql.
      return Boolean((data as { is_admin: boolean } | null)?.is_admin);
    },
  });

  const navItems = isAdminQuery.data
    ? [...baseNavItems, { to: "/admin", label: "Admin" } as const]
    : baseNavItems;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/feed" className="text-sm font-semibold tracking-tight text-foreground">
            Kellogg Recruiting Copilot
          </Link>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-3.5" aria-hidden />
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3 pb-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-primary/10 text-primary font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 pb-16">{children}</main>
      <SupportChatWidget />
    </div>
  );
}
