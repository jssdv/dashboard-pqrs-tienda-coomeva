// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Combobox } from "./Combobox";
import { Select } from "./Select";

afterEach(cleanup);

const listbox = () => screen.getByRole("listbox", { hidden: true });
const openList = (input: HTMLElement) => act(() => input.focus());

const ESTADOS = [
  { value: "abiertos", label: "Abiertos" },
  { value: "cerrados", label: "Cerrados" },
];

const PROVEEDORES = [
  { value: "Tienda", label: "Tienda" },
  { value: "Educación / Coomeva", label: "Educación / Coomeva" },
  { value: "Lagobo", label: "Lagobo" },
];

it("Select shows the label and current value", () => {
  render(<Select label="Estado" value="cerrados" onChange={() => {}} options={ESTADOS} />);
  const button = screen.getByRole("button", { name: /Estado/ });
  expect(button.textContent).toContain("Cerrados");
});

it("Select emits the chosen value and '' for Todos", () => {
  const onChange = vi.fn();
  const view = render(<Select label="Estado" value="" onChange={onChange} options={ESTADOS} />);
  fireEvent.click(screen.getByRole("button", { name: /Estado/ }));
  fireEvent.click(within(listbox()).getByRole("option", { name: "Abiertos", hidden: true }));
  expect(onChange).toHaveBeenLastCalledWith("abiertos");
  view.unmount();
  render(<Select label="Estado" value="abiertos" onChange={onChange} options={ESTADOS} />);
  fireEvent.click(screen.getByRole("button", { name: /Estado/ }));
  fireEvent.click(within(listbox()).getByRole("option", { name: "Todos", hidden: true }));
  expect(onChange).toHaveBeenLastCalledWith("");
});

it("Combobox finds options ignoring accents and case", () => {
  render(<Combobox label="Proveedor" value="" onChange={() => {}} options={PROVEEDORES} />);
  const input = screen.getByRole("combobox", { name: "Proveedor" });
  openList(input);
  fireEvent.change(input, { target: { value: "educacion" } });
  const options = within(listbox()).getAllByRole("option", { hidden: true });
  expect(options.map((option) => option.textContent)).toEqual(["Educación / Coomeva"]);
});

it("Combobox starts empty with Todos as placeholder so typing is not appended to it", () => {
  render(<Combobox label="Proveedor" value="" onChange={() => {}} options={PROVEEDORES} />);
  const input = screen.getByRole("combobox", { name: "Proveedor" }) as HTMLInputElement;
  expect(input.value).toBe("");
  expect(input.placeholder).toBe("Todos");
});

it("Combobox emits the chosen value", () => {
  const onChange = vi.fn();
  render(<Combobox label="Proveedor" value="" onChange={onChange} options={PROVEEDORES} />);
  const input = screen.getByRole("combobox", { name: "Proveedor" });
  openList(input);
  fireEvent.change(input, { target: { value: "lago" } });
  fireEvent.click(within(listbox()).getByRole("option", { name: "Lagobo", hidden: true }));
  expect(onChange).toHaveBeenLastCalledWith("Lagobo");
});

it("Combobox says Sin resultados when nothing matches and emits nothing", () => {
  const onChange = vi.fn();
  render(<Combobox label="Proveedor" value="" onChange={onChange} options={PROVEEDORES} />);
  const input = screen.getByRole("combobox", { name: "Proveedor" });
  openList(input);
  fireEvent.change(input, { target: { value: "zzz" } });
  expect(screen.getByText("Sin resultados")).toBeTruthy();
  expect(onChange).not.toHaveBeenCalled();
});

it("Combobox shows a value that is not in the options and can clear it", () => {
  const onChange = vi.fn();
  render(<Combobox label="Proveedor" value="Inexistente" onChange={onChange} options={PROVEEDORES} />);
  const input = screen.getByRole("combobox", { name: "Proveedor" }) as HTMLInputElement;
  expect(input.value).toBe("Inexistente");
  fireEvent.click(screen.getByRole("button", { name: "Limpiar Proveedor" }));
  expect(onChange).toHaveBeenLastCalledWith("");
});

it("Combobox closes with Escape without changing the value", () => {
  const onChange = vi.fn();
  render(<Combobox label="Proveedor" value="" onChange={onChange} options={PROVEEDORES} />);
  const input = screen.getByRole("combobox", { name: "Proveedor" });
  openList(input);
  expect(screen.queryByRole("listbox", { hidden: true })).not.toBeNull();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("listbox", { hidden: true })).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});

it("Select without a Todos option shows the placeholder when empty", () => {
  render(
    <Select label="Fuente" value="" onChange={() => {}} options={ESTADOS} allLabel={null} placeholder="Selecciona…" />,
  );
  const button = screen.getByRole("button", { name: /Fuente/ });
  expect(button.textContent).toContain("Selecciona…");
  fireEvent.click(button);
  const options = within(listbox()).getAllByRole("option", { hidden: true });
  expect(options.map((option) => option.textContent)).toEqual(["Abiertos", "Cerrados"]);
});

it("Select marks required fields and shows the error under the field", () => {
  render(
    <Select label="Fuente" value="" onChange={() => {}} options={ESTADOS} allLabel={null} required error="Fuente es obligatoria" />,
  );
  expect(screen.getByText("Fuente es obligatoria")).toBeTruthy();
  expect(screen.getByTitle("obligatorio")).toBeTruthy();
});

it("Combobox without Todos uses the placeholder and flags the error on the input", () => {
  render(
    <Combobox
      label="Proveedor"
      value=""
      onChange={() => {}}
      options={PROVEEDORES}
      allLabel={null}
      placeholder="Busca un proveedor"
      required
      error="Proveedor no está en la lista"
    />,
  );
  const input = screen.getByRole("combobox", { name: /Proveedor/ }) as HTMLInputElement;
  expect(input.placeholder).toBe("Busca un proveedor");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByText("Proveedor no está en la lista")).toBeTruthy();
  openList(input);
  const options = within(listbox()).getAllByRole("option", { hidden: true });
  expect(options.map((option) => option.textContent)).toEqual(["Tienda", "Educación / Coomeva", "Lagobo"]);
});
