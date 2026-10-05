import { Check, ChevronDown } from "lucide-react";
import {
  Button,
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  allLabel?: string;
}) {
  const all = [{ value: ALL_KEY, label: allLabel }, ...withCurrent(options, value)];
  return (
    <AriaSelect
      className="grid gap-1.5"
      selectedKey={value === "" ? ALL_KEY : value}
      onSelectionChange={(key) => onChange(key === ALL_KEY || key === null ? "" : String(key))}
    >
      <Label className="text-sm font-medium">{label}</Label>
      <Button className={`${controlClass} cursor-pointer justify-between gap-2`}>
        <SelectValue className="truncate" />
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </Button>
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
