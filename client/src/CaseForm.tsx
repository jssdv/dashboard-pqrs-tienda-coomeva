import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, closeCase, createCase, getCases } from "./api";
import { fieldMessage } from "./format";
import { PageHead } from "./Shell";
import type { CloseFields, CreateFields, FieldError, PqrCase } from "./types";

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

const CREATE_FIELDS: Array<{ name: keyof CreateFields; label: string; type: string }> = [
  { name: "fechaInicial", label: "Fecha inicial", type: "date" },
  { name: "area", label: "Proveedor", type: "text" },
  { name: "idOrden", label: "ID de orden", type: "text" },
  { name: "asociado", label: "Asociado", type: "text" },
  { name: "correo", label: "Correo", type: "email" },
  { name: "fuente", label: "Fuente", type: "text" },
  { name: "tipo", label: "Tipo", type: "text" },
  { name: "tema", label: "Tema", type: "text" },
  { name: "motivo", label: "Motivo", type: "textarea" },
];

export function NuevoCaso() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<CreateFields>(EMPTY_CREATE);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await createCase(fields);
      navigate("/casos");
    } catch (reason) {
      setErrors(errorsOf(reason));
      setPending(false);
    }
  }

  return (
    <>
      <PageHead title="Nuevo caso" lede="La fecha y el texto de solución se registran al cerrar." />
      <Card className="max-w-xl shadow-sm">
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} noValidate>
            <ErrorSummary errors={errors} />
            {CREATE_FIELDS.map((field) => (
              <Field
                key={field.name}
                id={field.name}
                label={field.label}
                type={field.type}
                value={fields[field.name]}
                error={fieldMessage(errors, field.name)}
                onChange={(value) => setFields((current) => ({ ...current, [field.name]: value }))}
              />
            ))}
            <Button className="mt-5 min-h-11" type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar caso"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

export function CerrarCaso() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [caso, setCaso] = useState<PqrCase | null>(null);
  const [missing, setMissing] = useState(false);
  const [fields, setFields] = useState<CloseFields>({ fechaSolucion: "", solucion: "" });
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
      await closeCase(id, fields);
      navigate("/casos");
    } catch (reason) {
      setErrors(errorsOf(reason));
      setPending(false);
    }
  }

  return (
    <>
      <PageHead title="Cerrar caso" lede={caso?.id ?? id} />
      {missing ? (
        <p className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">No se encontró el caso.</p>
      ) : null}
      <Card className="max-w-xl shadow-sm">
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} noValidate>
            <ErrorSummary errors={errors} />
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
            />
            <Button className="mt-5 min-h-11" type="submit" disabled={pending || missing}>
              {pending ? "Guardando…" : "Cerrar caso"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
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
    <div id="errores" role="alert" className="mb-4 rounded-xl border border-orange-300 bg-orange-50 p-3 text-warning-foreground">
      <p className="mb-2">Revisa los campos marcados.</p>
      <ul className="m-0 grid list-disc gap-1 pl-5">
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
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  error: string;
  onChange: (value: string) => void;
}) {
  const describedBy = error ? `error-${id}` : undefined;
  return (
    <div className="mt-4 grid gap-1.5">
      <Label htmlFor={id}>
        {label}{" "}
        <abbr className="text-warning no-underline" title="obligatorio">
          *
        </abbr>
      </Label>
      {type === "textarea" ? (
        <Textarea
          id={id}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={type}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error ? (
        <p id={`error-${id}`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
