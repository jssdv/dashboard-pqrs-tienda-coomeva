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
import { Bitacora } from "./Bitacora";
import { CaseTimeline } from "./ui/CaseTimeline";
import { TipoTag } from "./ui/TipoTag";
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
            <div className="grid gap-5 px-4 pb-2">
              {plazo ? <Badge variant={plazo.variant} className="w-fit">{plazo.text}</Badge> : null}
              <CaseTimeline caso={caso} />
              <section aria-labelledby="det-caso" className="grid gap-3">
                <h3 id="det-caso" className="text-sm font-semibold">Caso</h3>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Fecha inicial" value={caso.fechaInicial} />
                  <Field label="Fecha de solución" value={caso.fechaSolucion} />
                  <div className="min-w-0">
                    <dt className="text-sm text-muted-foreground">Tipo</dt>
                    <dd className="m-0"><TipoTag tipo={caso.tipo} /></dd>
                  </div>
                  <Field label="Tema" value={caso.tema} />
                  <Field label="Fuente" value={caso.fuente} />
                  <Field label="ID de orden" value={caso.idOrden} />
                </dl>
              </section>
              <section aria-labelledby="det-persona" className="grid gap-3">
                <h3 id="det-persona" className="text-sm font-semibold">Persona</h3>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Asociado" value={caso.asociado} />
                  <Field label="Correo" value={caso.correo} />
                </dl>
              </section>
              <section aria-labelledby="det-texto" className="grid gap-3">
                <h3 id="det-texto" className="text-sm font-semibold">Texto</h3>
                <dl className="grid gap-3">
                  <Field label="Motivo" value={caso.motivo} />
                  <Field label="Solución" value={caso.solucion} />
                </dl>
              </section>
              <Bitacora caseId={caso.id} />
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
