# Buscar un caso

## Objetivo

En Casos, una caja recorta la lista por orden, asociado o correo. La ficha sigue siendo la tarjeta de la lista. Detalle no cambia. No hay página de un solo caso.

## Comportamiento

La caja está en la fila de filtros, junto a estado, área y tipo. La etiqueta es **Buscar**. El texto de ayuda es «Orden, asociado o correo».

Lo escrito va a la URL como `?q=`, con el texto tal cual, para que la caja muestre lo que se escribió. Cada tecla actualiza esa URL reemplazando la entrada actual. Atrás no recorre letra por letra.

La comparación usa la misma regla que `lookupKey`: quitar tildes, recortar y colapsar espacios, pasar a mayúsculas. El caso entra si el texto normalizado aparece dentro de la orden, del asociado o del correo. «ana» encuentra a Ana María y a `ana@…`. «boleteria» encuentra «Boletería». «123» encuentra una orden que contenga 123.

Un `q` vacío o formado solo por espacios no filtra. Un campo nulo o vacío no coincide. No se busca en motivo, solución ni en el resto de columnas.

El caso tiene que cumplir la búsqueda y, además, estado, área, tipo, cola y mes. Cambiar el texto borra `pagina` y vuelve a la página 1. **Quitar filtros** lleva a `/casos` y por eso borra `q` junto con estado, área, tipo, cola y mes. El enlace se muestra también cuando el único filtro activo es `q`.

Si no queda ningún caso, el texto sigue siendo «No hay casos con ese filtro».

## Datos

`GET /api/casos` no cambia. Sigue filtrando por cola, área, tipo y mes. Nombre, correo y orden ya vienen en esa respuesta y no salen por `GET /summary`.

La búsqueda no vuelve a pedir datos. El orden es: respuesta del servidor, filtro de estado en el cliente, `matchesSearch`, página de 20. Si la API falla, se muestra el error de siempre. La búsqueda no lo tapa.

## Código

`matchesSearch` es una función pura en el cliente. El cliente no importa el dominio de Node, así que no llama a `lookupKey`. Repite la regla de normalización. Vive junto a Casos y se usa solo ahí.

La tarjeta, el alta y el cierre no cambian.

## Pruebas

En `client/src/screens.test.tsx`:

- «ana» deja visible a un asociado Ana María y a un correo `ana@…`, y oculta a otra persona.
- «boleteria» deja visible un asociado o correo «Boletería».
- Una orden que contiene «123» entra.
- Con estado Abiertos, un caso cerrado que coincide con el texto no entra.
- Sin resultados se lee «No hay casos con ese filtro».
- Siguen pasando las pruebas de 20 fichas, «Nuevo caso» y el resumen.

## Fuera de alcance

No hay página `/casos/:id` de lectura. No hay parámetro `q` en el servidor. No se corrigen correos guardados como `[object Object]`. No se cambia el catálogo de área y tipo, que sigue saliendo de la respuesta actual.
