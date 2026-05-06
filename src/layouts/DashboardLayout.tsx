import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { LayoutDashboard, FileText, Users, Settings as SettingsIcon, ShieldCheck, LogOut, Sun, Moon, Award, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const baseItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/resumes", label: "Resumes", icon: FileText },
  { to: "/dashboard/certificates", label: "Certificates", icon: Award },
  { to: "/dashboard/recruiters", label: "Recruiters", icon: Users },
  { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

function AppSidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [items, setItems] = useState(baseItems);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data?.some((r) => r.role === "admin")) {
          setItems([
            ...baseItems.slice(0, -1),
            { to: "/dashboard/admin", label: "Admin", icon: BarChart3 },
            baseItems[baseItems.length - 1],
          ]);
        }
      });
  }, [user]);
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex h-16 items-center gap-2 px-4 font-display font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="group-data-[collapsible=icon]:hidden">SkillProof</span>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const active = it.end ? pathname === it.to : pathname.startsWith(it.to);
                return (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={it.to} end={it.end} className="flex items-center gap-2">
                        <it.icon className="h-4 w-4" />
                        <span>{it.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to site</Link>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                <Sun className="h-4 w-4 dark:hidden" />
                <Moon className="hidden h-4 w-4 dark:block" />
              </Button>
              <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
