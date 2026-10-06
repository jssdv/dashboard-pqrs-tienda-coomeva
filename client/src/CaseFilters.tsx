import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Combobox } from "./ui/Combobox";
import type { Option } from "./ui/options";
import { Select } from "./ui/Select";
import { useMinWidth } from "./useMinWidth";

export type FilterKey = "estado" | "plazo" | "area" | "tipo" | "tema";

const ESTADOS: Option[] = [
  { value: "abiertos", label: "Abiertos" },
  { value: "cerrados", label: "Cerrados" },
];

const PLAZOS: Option[] = [
  { value: "en-plazo", label: "En plazo" },
  { value: "por-vencer", label: "Por vencer" },
  { value: "vencido", label: "Vencido" },
];

export function CaseFilters({
  q,
  onSearch,
  values,
  options,
  onChange,
  activeCount,
}: {
  q: string;
  onSearch: (value: string) => void;
  values: Record<FilterKey, string>;
  options: { areas: Option[]; tipos: Option[]; temas: Option[] };
  onChange: (key: FilterKey, value: string) => void;
  activeCount: number;
}) {
  const wide = useMinWidth("(min-width: 768px)");
  const [expanded, setExpanded] = useState(false);
  const [sheet, setSheet] = useState(false);
  const label = activeCount > 0 ? `Filtros (${activeCount})` : "Filtros";

  const estado = <Select label="Estado" value={values.estado} onChange={(v) => onChange("estado", v)} options={ESTADOS} />;
  const plazo = <Select label="Plazo" value={values.plazo} onChange={(v) => onChange("plazo", v)} options={PLAZOS} />;
  const area = <Combobox label="Proveedor" value={values.area} onChange={(v) => onChange("area", v)} options={options.areas} />;
  const tipo = <Combobox label="Tipo" value={values.tipo} onChange={(v) => onChange("tipo", v)} options={options.tipos} />;
  const tema = <Combobox label="Tema" value={values.tema} onChange={(v) => onChange("tema", v)} options={options.temas} />;

  const search = (
    <div className="grid min-w-[12rem] flex-1 gap-1.5">
      <Label htmlFor="buscar">Buscar</Label>
      <Input
        id="buscar"
        placeholder="Orden, asociado o correo"
        value={q}
        onChange={(event) => onSearch(event.target.value)}
      />
    </div>
  );

  const toggle = (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 gap-2"
      aria-expanded={wide ? expanded : sheet}
      onClick={() => (wide ? setExpanded(!expanded) : setSheet(true))}
    >
      {label}
    </Button>
  );

  return (
    <div data-toolbar className="mb-4 grid gap-3 border border-border bg-card p-3">
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        {search}
        {wide ? (
          <>
            <div className="w-40">{estado}</div>
            <div className="w-40">{plazo}</div>
          </>
        ) : null}
        {toggle}
        <Button asChild variant="secondary" className="min-h-11 md:hidden">
          <Link to="/casos/nuevo">Nuevo caso</Link>
        </Button>
      </div>
      {wide && expanded ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {area}
          {tipo}
          {tema}
        </div>
      ) : null}
      {!wide ? (
        <Sheet open={sheet} onOpenChange={setSheet}>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Los cambios se aplican al instante.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4">
              {estado}
              {plazo}
              {area}
              {tipo}
              {tema}
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" className="min-h-11 w-full">
                  Listo
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
