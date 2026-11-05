import { parseDate } from "@internationalized/date";
import {
  Button,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Dialog,
  DialogTrigger,
  Heading,
  I18nProvider,
  Popover,
  RangeCalendar,
} from "react-aria-components";
import { popoverClass } from "./options";

export type Periodo = { desde: string; hasta: string } | null;

const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function label(value: Periodo): string {
  if (!value) return "Todo el periodo";
  const [desde, hasta] = [value.desde, value.hasta].map((iso) => fmt.format(parseDate(iso).toDate("UTC")));
  return `${desde} – ${hasta}`;
}

const navClass =
  "inline-flex size-9 cursor-pointer items-center justify-center border border-border text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

const inputClass =
  "min-h-9 w-full border border-input bg-card px-2 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Un extremo vacío toma el otro; si quedan invertidos, el extremo editado manda.
function setBound(value: Periodo, edited: "desde" | "hasta", iso: string): Periodo {
  if (!iso) return null;
  const next = { desde: value?.desde || iso, hasta: value?.hasta || iso };
  next[edited] = iso;
  if (next.desde > next.hasta) {
    if (edited === "desde") next.hasta = iso;
    else next.desde = iso;
  }
  return next;
}

export function PeriodPicker({ value, onChange }: { value: Periodo; onChange: (value: Periodo) => void }) {
  const range = value ? { start: parseDate(value.desde), end: parseDate(value.hasta) } : null;
  return (
    <I18nProvider locale="es-CO">
      <DialogTrigger>
        <Button className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-border bg-card px-3 font-mono text-xs font-medium text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:min-h-9">
          <span aria-hidden="true">Periodo:</span> {label(value)}
        </Button>
        <Popover placement="bottom end" offset={4} className={`${popoverClass} border border-border bg-card p-3 text-sm`}>
          <Dialog className="outline-none">
            {({ close }) => (
              <>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Desde
                    <input
                      type="date"
                      value={value?.desde ?? ""}
                      max={value?.hasta || undefined}
                      onChange={(event) => onChange(setBound(value, "desde", event.target.value))}
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Hasta
                    <input
                      type="date"
                      value={value?.hasta ?? ""}
                      min={value?.desde || undefined}
                      onChange={(event) => onChange(setBound(value, "hasta", event.target.value))}
                      className={inputClass}
                    />
                  </label>
                </div>
                <RangeCalendar
                  aria-label="Periodo"
                  value={range}
                  onChange={(next) => {
                    onChange({ desde: next.start.toString(), hasta: next.end.toString() });
                  }}
                >
                  <header className="mb-2 flex items-center justify-between gap-2">
                    <Button slot="previous" className={navClass} aria-label="Mes anterior">
                      ‹
                    </Button>
                    <Heading className="font-display text-sm font-semibold" />
                    <Button slot="next" className={navClass} aria-label="Mes siguiente">
                      ›
                    </Button>
                  </header>
                  <CalendarGrid className="border-collapse">
                    <CalendarGridHeader>
                      {(day) => (
                        <CalendarHeaderCell className="p-1 text-center font-mono text-[0.65rem] font-medium text-muted-foreground uppercase">
                          {day}
                        </CalendarHeaderCell>
                      )}
                    </CalendarGridHeader>
                    <CalendarGridBody>
                      {(date) => (
                        <CalendarCell
                          date={date}
                          className={({ isSelected, isSelectionStart, isSelectionEnd, isOutsideMonth, isFocusVisible, isHovered }) =>
                            [
                              "flex size-9 cursor-pointer items-center justify-center font-mono text-xs tabular-nums outline-none",
                              isOutsideMonth ? "text-muted-foreground/50" : "text-foreground",
                              isSelected && !isSelectionStart && !isSelectionEnd ? "bg-accent" : "",
                              isSelectionStart || isSelectionEnd ? "bg-primary text-primary-foreground" : "",
                              isHovered && !isSelected ? "bg-accent" : "",
                              isFocusVisible ? "ring-2 ring-ring" : "",
                            ].join(" ")
                          }
                        />
                      )}
                    </CalendarGridBody>
                  </CalendarGrid>
                </RangeCalendar>
                <div className="mt-3 flex justify-between gap-2 border-t border-border pt-3">
                  <Button
                    className="min-h-9 cursor-pointer px-2 font-mono text-xs text-muted-foreground hover:text-foreground"
                    onPress={() => {
                      onChange(null);
                      close();
                    }}
                  >
                    Todo
                  </Button>
                  <Button className="min-h-9 cursor-pointer bg-foreground px-3 font-mono text-xs font-medium text-background" onPress={() => close()}>
                    Listo
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Popover>
      </DialogTrigger>
    </I18nProvider>
  );
}
