import type { ReactNode } from "react";
import { LayoutDashboard, List, Search, Store } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ui/ThemeToggle";
import { useVencidos } from "./useVencidos";

const navClass = (compact: boolean) => ({ isActive }: { isActive: boolean }) =>
  `relative flex min-h-11 cursor-pointer items-center rounded-lg text-sm font-semibold no-underline transition-[background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
    compact ? "justify-center px-0" : "gap-2 px-3"
  } ${
    isActive
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-foreground hover:bg-accent hover:text-accent-foreground"
  }`;

function Nav({
  vencidos,
  compact = false,
  onNavigate,
}: {
  vencidos: number | null;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const item = (label: string) => (compact ? { "aria-label": label, title: label } : {});
  return (
    <div className="grid gap-4">
      <nav aria-label="Principal" className="grid gap-1" onClick={onNavigate}>
        <NavLink to="/" end className={navClass(compact)} {...item("Panel")}>
          <LayoutDashboard aria-hidden="true" />
          {compact ? null : "Panel"}
        </NavLink>
        <NavLink
          to="/casos"
          className={navClass(compact)}
          {...(compact
            ? { "aria-label": vencidos ? `Casos, ${vencidos} vencidos` : "Casos", title: "Casos" }
            : {})}
        >
          <List aria-hidden="true" />
          {compact ? null : "Casos"}
          {vencidos ? (
            <Badge
              variant="destructive"
              className={compact ? "absolute -top-1 -right-1 px-1.5 text-[0.65rem]" : "ml-auto"}
              aria-label={`${vencidos} vencidos`}
            >
              {vencidos}
            </Badge>
          ) : null}
        </NavLink>
        <NavLink to="/proveedores" className={navClass(compact)} {...item("Proveedores")}>
          <Store aria-hidden="true" />
          {compact ? null : "Proveedores"}
        </NavLink>
      </nav>
    </div>
  );
}

const CRUMBS: Array<[RegExp, string[]]> = [
  [/^\/$/, ["Panel"]],
  [/^\/casos$/, ["Casos"]],
  [/^\/casos\/nuevo$/, ["Casos", "Nuevo caso"]],
  [/^\/casos\/[^/]+\/cerrar$/, ["Casos", "Cerrar caso"]],
  [/^\/proveedores$/, ["Proveedores"]],
];

function crumbsOf(pathname: string): string[] {
  return CRUMBS.find(([pattern]) => pattern.test(pathname))?.[1] ?? [];
}

function Today() {
  const text = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(new Date());
  return <p className="px-3 text-xs text-muted-foreground">Datos al {text}</p>;
}

export function Shell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const vencidos = useVencidos();
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  function openSearch(from?: HTMLElement | null) {
    const active = document.activeElement;
    returnFocus.current = from ?? (active instanceof HTMLElement && active !== document.body ? active : searchButton.current);
    setSearchOpen(true);
  }
  const crumbs = crumbsOf(location.pathname);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((current) => {
          if (!current) {
            const active = document.activeElement;
            returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : searchButton.current;
          }
          return !current;
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <TooltipProvider>
      <div data-app-frame className="flex h-dvh overflow-hidden bg-background text-foreground">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-40 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Saltar al contenido
        </a>
        <aside className="hidden w-52 shrink-0 flex-col border-r border-border bg-card px-3 py-5 lg:flex">
          <div className="mb-6 flex items-center gap-2 px-3">
            <span className="grid size-8 place-items-center rounded-lg bg-primary font-display text-xs font-bold text-primary-foreground">
              PQ
            </span>
            <span className="font-display text-base font-semibold tracking-tight">PQRS</span>
          </div>
          <Nav vencidos={vencidos} />
          <div className="mt-auto pt-6">
            <Today />
          </div>
        </aside>
        <aside className="hidden w-16 shrink-0 flex-col border-r border-border bg-card px-2 py-5 md:flex lg:hidden">
          <Nav vencidos={vencidos} compact />
        </aside>
        <div className="app-canvas flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header
            data-topbar
            className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8"
          >
            <nav aria-label="Ruta" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground">
              <span className="font-display font-semibold text-primary md:text-muted-foreground md:font-normal">PQRS</span>
              {crumbs.map((crumb, index) => (
                <span key={crumb} className="hidden items-center gap-1.5 md:flex">
                  <span aria-hidden="true">/</span>
                  <span className={index === crumbs.length - 1 ? "font-medium text-foreground" : ""}>{crumb}</span>
                </span>
              ))}
            </nav>
            <Button
              ref={searchButton}
              type="button"
              variant="outline"
              aria-label="Buscar"
              className="min-h-11 gap-2 text-muted-foreground md:w-56 md:justify-start"
              onClick={() => openSearch(searchButton.current)}
            >
              <Search aria-hidden="true" />
              <span aria-hidden="true" className="hidden flex-1 text-left md:inline">
                Buscar…
              </span>
              <kbd aria-hidden="true" className="hidden rounded border border-border px-1.5 font-mono text-[0.7rem] md:inline">
                Ctrl K
              </kbd>
            </Button>
            <ThemeToggle />
            <Button asChild className="hidden min-h-11 md:inline-flex">
              <Link to="/casos/nuevo">Nuevo caso</Link>
            </Button>
            <div className="md:hidden">
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
                    <Nav vencidos={vencidos} onNavigate={() => setOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>
          <main
            id="contenido"
            className="mx-auto min-h-0 w-full min-w-0 max-w-[72rem] flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 md:px-8 md:py-8"
          >
            <div key={location.pathname} className="rise-in">
              <Outlet />
            </div>
          </main>
          <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} returnFocusTo={returnFocus} />
        </div>
      </div>
    </TooltipProvider>
  );
}

export function PageHead({ title, lede, actions }: { title: string; lede?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight">{title}</h1>
        {lede ? <p className="mt-1 max-w-2xl text-muted-foreground">{lede}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
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
    <UiCard className="h-full min-w-0 border-border shadow-none">
      <CardHeader className="pb-0">
        <Title className="font-display text-lg font-semibold">{title}</Title>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </UiCard>
  );
}

export const fieldClass =
  "flex min-h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground shadow-xs transition-[color,box-shadow] duration-200 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm";
