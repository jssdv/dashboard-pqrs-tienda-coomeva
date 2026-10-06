import { Check, ChevronDown, X } from "lucide-react";
import {
  Button,
  ComboBox as AriaComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import {
  ALL_KEY,
  controlClass,
  itemClass,
  listClass,
  searchKey,
  withCurrent,
  type Option,
} from "./options";

export function Combobox({
  label,
  value,
  onChange,
  options,
  allLabel = "Todos",
  emptyText = "Sin resultados",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  allLabel?: string;
  emptyText?: string;
}) {
  const all = [{ value: ALL_KEY, label: allLabel }, ...withCurrent(options, value)];
  return (
    <AriaComboBox
      className="grid gap-1.5"
      selectedKey={value === "" ? null : value}
      onSelectionChange={(key) => {
        if (key === null) return;
        onChange(key === ALL_KEY ? "" : String(key));
      }}
      defaultFilter={(text, input) => searchKey(text).includes(searchKey(input))}
      menuTrigger="focus"
      allowsEmptyCollection
    >
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative flex">
        <Input
          className={`${controlClass} pr-16`}
          placeholder={allLabel}
          onFocus={(event) => event.currentTarget.select()}
        />
        {value !== "" ? (
          <button
            type="button"
            aria-label={`Limpiar ${label}`}
            className="absolute top-0 right-8 grid h-full w-8 cursor-pointer place-items-center text-muted-foreground hover:text-foreground"
            onClick={() => onChange("")}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
        <Button
          aria-label={`Mostrar opciones de ${label}`}
          className="absolute top-0 right-0 grid h-full w-8 cursor-pointer place-items-center text-muted-foreground"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <Popover offset={4}>
        <ListBox
          className={listClass}
          items={all}
          renderEmptyState={() => <p className="px-3 py-2 text-muted-foreground">{emptyText}</p>}
        >
          {(item) => (
            <ListBoxItem id={item.value} textValue={item.label} className={itemClass}>
              {({ isSelected }) => (
                <>
                  <span className="truncate">{item.label}</span>
                  {isSelected ? <Check aria-hidden="true" className="size-4 shrink-0 text-primary" /> : null}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}
