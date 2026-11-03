import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, closeCase, createCase, getCases, getCatalogs } from "./api";
import { fieldMessage } from "./format";
import { bogotaToday } from "./metrics";
import { Combobox } from "./ui/Combobox";
import { FormDialog } from "./ui/FormDialog";
import { PlazoBar } from "./ui/PlazoBar";
import { Select } from "./ui/Select";
import { TipoTag } from "./ui/TipoTag";
import { CAUSAS_RAIZ, type Catalogs, type CloseFields, type CreateFields, type FieldError, type PqrCase } from "./types";

const EMPTY_CREATE: CreateFields = {
  fechaInicial: "",
  area: "",
  idOrden: "",
  asociado: "",
  correo: "",
  fuente: "",
  tipo: "",
  tema: "",
  motivo: "",
};

type ListKind = "select" | "combobox";

const CREATE_FIELDS: Array<{ name: keyof CreateFields; label: string; type: string; list?: ListKind }> = [
  { name: "fechaInicial", label: "Fecha inicial", type: "date" },
  { name: "area", label: "Proveedor", type: "text", list: "combobox" },
  { name: "idOrden", label: "ID de orden", type: "text" },
  { name: "asociado", label: "Asociado", type: "text" },
  { name: "correo", label: "Correo", type: "email" },
  { name: "fuente", label: "Fuente", type: "text", list: "select" },
  { name: "tipo", label: "Tipo", type: "text", list: "select" },
  { name: "tema", label: "Tema", type: "text", list: "combobox" },
  { name: "motivo", label: "Motivo", type: "textarea" },
];

const SECTIONS: Array<{ title: string; names: Array<keyof CreateFields>; grid: string }> = [
  { title: "Datos del caso", names: ["fechaInicial", "idOrden", "asociado", "correo"], grid: "sm:grid-cols-2 lg:grid-cols-4" },
  { title: "Clasificación", names: ["area", "fuente", "tipo", "tema"], grid: "sm:grid-cols-2 lg:grid-cols-4" },
  { title: "Detalle", names: ["motivo"], grid: "" },
];

function hasData(catalogs: Catalogs): boolean {
  return [catalogs.area, catalogs.fuente, catalogs.tipo, catalogs.tema].some((list) => list.length > 0);
}

function useReload(): () => void {
  const context = useOutletContext<{ reload?: () => void } | undefined>();
  return context?.reload ?? (() => {});
}

export function NuevoCaso() {
  const navigate = useNavigate();
  const reload = useReload();
  const [fields, setFields] = useState<CreateFields>(EMPTY_CREATE);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [pending, setPending] = useState(false);
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCatalogs().then(
      (next) => {
        if (!cancelled) setCatalogs(next);
      },
      () => {
        if (!cancelled) setCatalogsError("No se pudieron cargar las listas");
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = catalogs !== null && hasData(catalogs);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await createCase(fields);
      reload();
      navigate("/casos");
    } catch (reason) {
      setErrors(errorsOf(reason));
      setPending(false);
    }
  }

  return (
    <FormDialog
      title="Nuevo caso"
      description="La fecha y el texto de solución se registran al cerrar."
      submitLabel="Guardar caso"
      pending={pending}
      disabled={!ready}
      onClose={() => navigate("/casos")}
      onSubmit={onSubmit}
    >
      {catalogsError ? (
        <p role="alert" className="mb-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm">
          {catalogsError}
        </p>
      ) : null}
      {catalogs && !hasData(catalogs) ? (
        <p className="mb-3 rounded-lg border border-border bg-muted p-3 text-sm">
          Todavía no hay datos cargados. Importa el archivo primero (<code className="font-mono">npm run import</code>).
        </p>
      ) : null}
      <ErrorSummary errors={errors} />
      <div className="grid gap-5">
        {SECTIONS.map((section) => (
          <section key={section.title} aria-labelledby={`sec-${section.title}`} className="grid gap-3">
            <h2 id={`sec-${section.title}`} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {section.title}
            </h2>
            <div className={`grid grid-cols-1 gap-3 ${section.grid}`}>
              {CREATE_FIELDS.filter((field) => section.names.includes(field.name)).map((field) => {
                const onChange = (value: string) => setFields((current) => ({ ...current, [field.name]: value }));
                if (field.list) {
                  const options = (catalogs?.[field.name as keyof Catalogs] ?? []).map((value) => ({ value, label: value }));
                  const shared = {
                    label: field.label,
                    value: fields[field.name],
                    onChange,
                    options,
                    allLabel: null,
                    required: true,
                    error: fieldMessage(errors, field.name) || undefined,
                  };
                  return (
                    <div key={field.name} id={field.name} className="min-w-0">
                      {field.list === "select" ? (
                        <Select {...shared} placeholder="Selecciona…" />
                      ) : (
                        <Combobox {...shared} placeholder="Busca…" />
                      )}
                    </div>
                  );
                }
                return (
                  <Field
                    key={field.name}
                    id={field.name}
                    label={field.label}
                    type={field.type}
                    value={fields[field.name]}
                    error={fieldMessage(errors, field.name)}
                    onChange={onChange}
                    autoFocus={field.name === "fechaInicial"}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </FormDialog>
  );
}

export function CerrarCaso() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const reload = useReload();
  const [caso, setCaso] = useState<PqrCase | null>(null);
  const [missing, setMissing] = useState(false);
  const [fields, setFields] = useState<CloseFields>(() => ({ fechaSolucion: bogotaToday(), solucion: "" }));
  const [causa, setCausa] = useState("");
  const [accion, setAccion] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCases({}).then(
      (rows) => {
        if (cancelled) return;
        const found = rows.find((row) => row.id === id) ?? null;
        setCaso(found);
        setMissing(!found);
      },
      () => {
        if (!cancelled) setMissing(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await closeCase(id, {
        ...fields,
        ...(causa ? { causaRaiz: causa } : {}),
        ...(accion.trim() ? { accionCorrectiva: accion.trim() } : {}),
      });
      reload();
      navigate("/casos");
    } catch (reason) {
      setErrors(errorsOf(reason));
      setPending(false);
    }
  }

  return (
    <FormDialog
      title="Cerrar caso"
      description="Registra la fecha y cómo se resolvió."
      width="md"
      submitLabel="Cerrar caso"
      pending={pending}
      disabled={missing || caso === null}
      onClose={() => navigate("/casos")}
      onSubmit={onSubmit}
    >
      {missing ? (
        <p className="mb-3 rounded-lg border border-border bg-muted p-3 text-sm">No se encontró el caso.</p>
      ) : null}
      {caso ? <CaseSummary caso={caso} /> : null}
      <ErrorSummary errors={errors} />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[11rem_1fr]">
        <Field
          id="fechaSolucion"
          label="Fecha de solución"
          type="date"
          value={fields.fechaSolucion}
          error={fieldMessage(errors, "fechaSolucion")}
          onChange={(value) => setFields((current) => ({ ...current, fechaSolucion: value }))}
        />
        <Field
          id="solucion"
          label="Texto de solución"
          type="textarea"
          value={fields.solucion}
          error={fieldMessage(errors, "solucion")}
          onChange={(value) => setFields((current) => ({ ...current, solucion: value }))}
          autoFocus
        />
        <Select
          label="Causa raíz (opcional)"
          value={causa}
          onChange={setCausa}
          options={CAUSAS_RAIZ.map((value) => ({ value, label: value }))}
          allLabel="Sin definir"
        />
        <Field
          id="accionCorrectiva"
          label="Acción correctiva (opcional)"
          type="textarea"
          value={accion}
          error=""
          onChange={setAccion}
        />
      </div>
    </FormDialog>
  );
}

function CaseSummary({ caso }: { caso: PqrCase }) {
  const riesgo = caso.riesgo;
  return (
    <section aria-label="Resumen del caso" className="grid gap-3 border border-border bg-muted/40 p-3">
      <dl className="m-0 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Orden</dt>
          <dd className="m-0 truncate font-mono">{caso.idOrden ?? "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Asociado</dt>
          <dd className="m-0 truncate">{caso.asociado ?? "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Proveedor</dt>
          <dd className="m-0 truncate">{caso.area ?? "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Tipo</dt>
          <dd className="m-0">
            <TipoTag tipo={caso.tipo} />
          </dd>
        </div>
      </dl>
      {riesgo ? (
        <div className="grid gap-1">
          <PlazoBar
            dias={riesgo.diasAbiertos}
            estado={riesgo.estado}
            plazo={riesgo.diasAbiertos + riesgo.diasParaVencer}
          />
          <p className="m-0 text-xs text-muted-foreground">
            Abierto desde {caso.fechaInicial} · {riesgo.diasAbiertos} días hábiles
          </p>
        </div>
      ) : (
        <p className="m-0 text-xs text-muted-foreground">Abierto desde {caso.fechaInicial ?? "—"}</p>
      )}
    </section>
  );
}

function errorsOf(reason: unknown): FieldError[] {
  if (reason instanceof ApiError && reason.errors.length > 0) return reason.errors;
  const message = reason instanceof Error ? reason.message : "No se pudo guardar el caso";
  return [{ field: "form", message }];
}

function ErrorSummary({ errors }: { errors: FieldError[] }) {
  if (errors.length === 0) return null;
  return (
    <div id="errores" role="alert" className="mb-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-warning-foreground">
      <p className="m-0 mb-1.5">Revisa los campos marcados.</p>
      <ul className="m-0 grid list-disc gap-0.5 pl-5">
        {errors.map((error, index) => (
          <li key={`${error.field}-${index}`}>
            <a className="text-primary underline-offset-2 hover:underline" href={error.field === "form" ? "#errores" : `#${error.field}`}>
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  error,
  onChange,
  autoFocus,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  error: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const describedBy = error ? `error-${id}` : undefined;
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <Label htmlFor={id}>
        {label}{" "}
        <abbr className="text-destructive no-underline" title="obligatorio">
          *
        </abbr>
      </Label>
      {type === "textarea" ? (
        <Textarea
          id={id}
          rows={3}
          data-autofocus={autoFocus ? "" : undefined}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-20 resize-none"
        />
      ) : (
        <Input
          id={id}
          type={type}
          data-autofocus={autoFocus ? "" : undefined}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? (
        <p id={`error-${id}`} className="m-0 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
