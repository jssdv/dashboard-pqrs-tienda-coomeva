import type { ReactNode } from "react";
import { LayoutDashboard, List, Plus, Store } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card as UiCard, CardContent, CardHeader } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useVencidos } from "./useVencidos";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold no-underline transition-[background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
    isActive
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-foreground hover:bg-accent hover:text-accent-foreground"
  }`;

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const vencidos = useVencidos();
  return (
    <div className="grid gap-4">
      <Button asChild className="min-h-11 w-full">
        <Link to="/casos/nuevo" onClick={onNavigate}>
          <Plus aria-hidden="true" />
          Nuevo caso
        </Link>
      </Button>
      <nav aria-label="Principal" className="grid gap-1" onClick={onNavigate}>
        <NavLink to="/" end className={navClass}>
          <LayoutDashboard aria-hidden="true" />
          Resumen
        </NavLink>
        <NavLink to="/casos" className={navClass}>
          <List aria-hidden="true" />
          Casos
          {vencidos ? (
            <Badge variant="destructive" className="ml-auto" aria-label={`${vencidos} vencidos`}>
              {vencidos}
            </Badge>
          ) : null}
        </NavLink>
        <NavLink to="/proveedores" className={navClass}>
          <Store aria-hidden="true" />
          Proveedores
        </NavLink>
      </nav>
    </div>
  );
}

export function Shell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <TooltipProvider>
      <div data-app-frame className="flex h-dvh overflow-hidden bg-background text-foreground">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-40 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Saltar al contenido
        </a>
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-card px-3 py-6 md:flex">
          <Nav />
        </aside>
        <div className="app-canvas flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 md:hidden">
            <span className="font-display text-lg font-bold text-primary">PQRS</span>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="min-h-11">
                  Menú
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>PQRS</SheetTitle>
                  <SheetDescription>Navegación</SheetDescription>
                </SheetHeader>
                <div className="px-4">
                  <Nav onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <main
            id="contenido"
            className="mx-auto min-h-0 w-full min-w-0 max-w-[72rem] flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 md:px-8 md:py-8"
          >
            <div key={location.pathname} className="rise-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function PageHead({ title, lede }: { title: string; lede?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight">{title}</h1>
      {lede ? <p className="mt-1 max-w-2xl text-muted-foreground">{lede}</p> : null}
    </header>
  );
}

export function Card({
  title,
  children,
  level = 2,
}: {
  title: string;
  children: ReactNode;
  level?: 2 | 3;
}) {
  const Title = level === 2 ? "h2" : "h3";
  return (
    <UiCard className="h-full border-border shadow-none">
      <CardHeader className="pb-0">
        <Title className="font-display text-lg font-semibold">{title}</Title>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </UiCard>
  );
}

export const fieldClass =
  "flex min-h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground shadow-xs transition-[color,box-shadow] duration-200 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm";
