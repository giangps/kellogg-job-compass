import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { ReferrerAppShell } from "@/components/ReferrerAppShell";

export const Route = createFileRoute("/referrer")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    if (data.user.user_metadata?.['role'] !== "referrer") {
      throw redirect({ to: "/feed" });
    }
    return { user: data.user };
  },
  component: () => (
    <ReferrerAppShell>
      <Outlet />
    </ReferrerAppShell>
  ),
});
