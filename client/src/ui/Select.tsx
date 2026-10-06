import { Check, ChevronDown } from "lucide-react";
import {
  Button,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
} from "react-aria-components";
import { ALL_KEY, controlClass, itemClass, listClass, withCurrent, type Option } from "./options";

export function Select({
  label,
  value,
  onChange,
  options,
  allLabel = "Todos",
  placeholder,
  required = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  allLabel?: string | null;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  const all = [...(allLabel === null ? [] : [{ value: ALL_KEY, label: allLabel }]), ...withCurrent(options, value)];
  return (
    <AriaSelect
      className="grid gap-1.5"
      selectedKey={value === "" ? (allLabel === null ? null : ALL_KEY) : value}
      placeholder={placeholder}
      isRequired={required}
      isInvalid={Boolean(error)}
      validationBehavior="aria"
      onSelectionChange={(key) => onChange(key === ALL_KEY || key === null ? "" : String(key))}
    >
      <Label className="text-sm font-medium">
        {label}
        {required ? (
          <>
            {" "}
            <abbr className="text-destructive no-underline" title="obligatorio">
              *
            </abbr>
          </>
        ) : null}
      </Label>
      <Button className={`${controlClass} cursor-pointer justify-between gap-2`}>
        <SelectValue className="truncate" />
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      <FieldError className="text-sm text-destructive">{error}</FieldError>
      <Popover offset={4}>
        <ListBox className={listClass} items={all}>
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
    </AriaSelect>
  );
}
