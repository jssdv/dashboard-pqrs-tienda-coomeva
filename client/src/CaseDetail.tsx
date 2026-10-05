import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { plazoLabel, textOrDash } from "./format";
import type { PqrCase } from "./types";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="m-0 break-words">{textOrDash(value)}</dd>
    </div>
  );
}

export function CaseDetail({ caso, onClose }: { caso: PqrCase | null; onClose: () => void }) {
  const open = caso !== null && caso.fechaSolucion === null;
  const plazo = caso ? plazoLabel(caso.riesgo) : null;
  return (
    <Sheet open={caso !== null} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetContent side="right" className="overflow-y-auto">
        {caso ? (
          <>
            <SheetHeader>
              <SheetTitle>Caso {caso.idOrden ?? caso.id}</SheetTitle>
              <SheetDescription>
                {textOrDash(caso.area)} · {textOrDash(caso.fechaInicial)}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4">
              {plazo ? <Badge variant={plazo.variant}>{plazo.text}</Badge> : null}
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Fecha inicial" value={caso.fechaInicial} />
                <Field label="Fecha de solución" value={caso.fechaSolucion} />
                <Field label="Tipo" value={caso.tipo} />
                <Field label="Tema" value={caso.tema} />
                <Field label="Fuente" value={caso.fuente} />
                <Field label="ID de orden" value={caso.idOrden} />
                <Field label="Asociado" value={caso.asociado} />
                <Field label="Correo" value={caso.correo} />
              </dl>
              <dl className="grid gap-4">
                <Field label="Motivo" value={caso.motivo} />
                <Field label="Solución" value={caso.solucion} />
              </dl>
            </div>
            {open ? (
              <SheetFooter>
                <Button asChild className="min-h-11 w-full">
                  <Link to={`/casos/${encodeURIComponent(caso.id)}/cerrar`}>Cerrar caso</Link>
                </Button>
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
