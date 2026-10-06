import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Casos } from "./Casos";
import { CerrarCaso, NuevoCaso } from "./CaseForm";
import { Proveedores } from "./Proveedores";
import { Resumen } from "./Resumen";
import { Shell } from "./Shell";

// A data router is needed for `viewTransition` links (cross-fade between screens).
const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <Resumen /> },
      {
        path: "casos",
        element: <Casos />,
        children: [
          { path: "nuevo", element: <NuevoCaso /> },
          { path: ":id/cerrar", element: <CerrarCaso /> },
        ],
      },
      { path: "proveedores", element: <Proveedores /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
