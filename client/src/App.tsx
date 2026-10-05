import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Casos } from "./Casos";
import { CerrarCaso, NuevoCaso } from "./CaseForm";
import { Proveedores } from "./Proveedores";
import { Resumen } from "./Resumen";
import { Shell } from "./Shell";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Resumen />} />
          <Route path="casos" element={<Casos />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="casos/nuevo" element={<NuevoCaso />} />
          <Route path="casos/:id/cerrar" element={<CerrarCaso />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
