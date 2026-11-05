import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { Admin } from "./Admin";
import { AuthProvider, RequireRole } from "./auth";
import { Casos } from "./Casos";
import { CerrarCaso, EditarCaso, NuevoCaso } from "./CaseForm";
import { Login } from "./Login";
import { Proveedores } from "./Proveedores";
import { Resumen } from "./Resumen";
import { Setup } from "./Setup";
import { Shell } from "./Shell";

const ALL = ["admin", "user", "viewer"] as const;
const WRITERS = ["admin", "user"] as const;

// A data router is needed for `viewTransition` links (cross-fade between screens).
const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      { path: "login", element: <Login /> },
      { path: "setup", element: <Setup /> },
      // The server already checked the share link; the viewer opens the dashboard like any other user.
      { path: "ver/:token", element: <Navigate to="/" replace /> },
      {
        element: (
          <RequireRole roles={[...ALL]}>
            <Shell />
          </RequireRole>
        ),
        children: [
          { index: true, element: <Resumen /> },
          {
            path: "casos",
            element: <Casos />,
            children: [
              {
                path: "nuevo",
                element: (
                  <RequireRole roles={[...WRITERS]}>
                    <NuevoCaso />
                  </RequireRole>
                ),
              },
              {
                path: ":id/cerrar",
                element: (
                  <RequireRole roles={[...WRITERS]}>
                    <CerrarCaso />
                  </RequireRole>
                ),
              },
              {
                path: ":id/editar",
                element: (
                  <RequireRole roles={[...WRITERS]}>
                    <EditarCaso />
                  </RequireRole>
                ),
              },
            ],
          },
          { path: "proveedores", element: <Proveedores /> },
          {
            path: "admin",
            element: (
              <RequireRole roles={["admin"]}>
                <Admin />
              </RequireRole>
            ),
          },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
