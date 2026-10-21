# Plan: App "Cuadre de Caja"

## Objetivo
Reemplazar el Excel `Cuadre de Fondo.xlsm` por una app web que se instala en el
celular/tablet de la tienda, pensada para un mejor control administrativo del
dinero, préstamos entre tiendas y tickets de mantenimiento.

## Stack elegido
- HTML + CSS + JS vanilla (sin frameworks, mismo stack que la calculadora de propinas)
- LocalStorage para guardar los datos (más adelante se puede migrar a Google Sheets/Firebase)
- PWA (manifest + service worker) para instalarla en el dispositivo y usarla offline
- Deploy final en GitHub Pages

## Estructura de archivos
```
index.html              -> la pagina
css/style.css           -> diseno (verde, mobile-first)
js/storage.js           -> lee/guarda en LocalStorage
js/app.js               -> logica de las pantallas
manifest.webmanifest    -> para instalarla como app
sw.js                   -> offline
```

## Las 5 pantallas
1. **Cuadre**: contador por denominacion MXN (botones grandes),
   Vales/Facturas, campo "Real", calcula Total y Diferencia.
   Guardar -> historial, reinicia conteo.
2. **Historial**: lista de cuadres guardados + Exportar CSV.
3. **Prestamos**: fecha, tienda origen, tienda destino, importe, concepto,
   estado (Pendiente/Devuelto). Lista + filtro + exportar CSV.
4. **Tickets**: fecha, numero de ticket, equipo, estado
   (Abierto/En curso/Cerrado), comentarios. Lista + exportar CSV.
5. **Tiendas**: catalogo CECO editable (8 tiendas del xlsm), usado en prestamos.

## Datos semilla (del xlsm)
- Tiendas CECO: BELISARIO DOMINGUEZ 38408, TUXTLA II DT 38525,
  PABELLON TUXTLA 38738, SAN CRISTOBAL 38781, TAPACHULA DT 38839,
  PATIO TAPACHULA 38946, COMITAN DT 38966, BELISARIO DT 38967
- Denominaciones MXN: 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.50
- Sin datos semilla de turnos. Los 6 nombres (PAOLA, KARLA, JANETH, CARLOS,
  FABIOLA, ESTHELA) y sus horarios SE DESCARTARON por decision del usuario.
  Motivo: en el xlsm vivian en la hoja "Hoja2" (hoja suelta, no en
  "CUADRE DE CAJA"), ningun nombre aparecia en la hoja del cuadre, y los
  horarios eran relleno automatico de Excel (5:30-1:30, 5:30-1:31, 6:00-2:00,
  8:00-4:00, 8:00-4:01, 8:00-4:02: los minutos se incrementan solos).

## Otras decisiones
- El cuadre es un registro financiero (NO es administrador de tareas).
- Tickets y prestamos se modelan como tareas con estado; un tablero kanban
  puede agregarse despues sin cambiar la logica.
- Descartar: hojas de graficos, dibujos de "..." y datos de prueba del xlsm.
- El Cuadre tiene DOS campos: "Nombre" (texto libre, se escribe el nombre de
  quien esta en caja) y "Turno" (Apertura / Cierre, inicio en Apertura).
  No hay lista de nombres: nada sugiere ni limita lo que se escriba.
  El historial los muestra como "30/09/2026 - Cierre" con el nombre debajo.
  El campo limpio al guardar y el Turno vuelve a Apertura.

## Pendiente (MVP)
- [x] Crear estructura del proyecto (index.html, css, js, manifest, sw)
- [x] Implementar LocalStorage (storage.js) con catalogo de tiendas
- [x] Vista Cuadre: contador MXN + vales + Real + Diferencia + guardar
- [x] Vista Historial con exportar CSV
- [x] Vista Prestamos con estados y exportar
- [x] Vista Tickets con estados y exportar
- [x] Vista Tiendas (catalogo editable)
- [x] PWA: manifest + service worker
- [x] Probar y documentar pasos de deploy a GitHub Pages

## Detalles implementados
- El nombre global del modulo de datos es `DB` (no `Storage`, que pisa el
  `window.Storage` nativo del navegador).
- Editar funciona en prestamos, tickets y tiendas (boton "Editar" + "Cancelar");
  borrar pide confirmacion.
- `DB.tiendas.guardar` actualiza solo si el CECO ya existe; si es nuevo, lo crea.
- Negativos se muestran como `-$1,234.50` (signo antes del simbolo).
- Las denominaciones usan un formato compacto propio: `$1000`, `$0.50`.
- Campos de un cuadre: fecha, nombre, turno, denominaciones[], efectivoContado,
  tillsCantidad, tillBase, tills, vales, declarado, diferencia. OJO: se renombraron `encargado` -> `nombre`,
  `real` -> `declarado`, y el `turno` paso de ser un nombre a ser
  Apertura/Cierre. No hay migracion: los cuadres guardados con los nombres
  viejos de campo mostraran esos valores vacios.
- Los prestamos CONGELAN el nombre de la tienda al guardarse: el registro
  guarda `origen`, `origenNombre`, `destino` y `destinoNombre`. Si despues se
  renombra o borra la tienda, el prestamo conserva el nombre con el que se
  creo (marca "dada de baja" si la tienda ya no existe). Solo se guarda el
  nombre a modo de respaldo legible; el CECO sigue siendo la llave real.
  `DB.congelarNombres()` rellena ese campo una sola vez en los prestamos
  antiguos que solo tenian el CECO.
- Borrar una tienda pide confirmacion distinta a borrar un registro: avisa
  cuantos prestamos la mencionan y sugiere Editar si solo era un renombramiento.
- Denominaciones y Tiendas van en la misma pantalla porque las dos son
  configuracion, pero NO comparten riesgo: cada cuadre guarda su propia copia de
  denominaciones, asi que cambiarlas nunca altera un cuadre ya guardado.

- "Declarado" es el conteo de la OTRA persona (quien recibe o cierra), NO lo que
  contaste tu. El nombre se eligio porque "Real" se prestaba a confusion: en el
  xlsm "Real" era el automatico (SUM de los contados) y en la app es manual.
  Recurrir a la app: Efectivo contado (automatico) - Vales = Esperado;
  se compara contra Declarado para obtener la Diferencia.
- El borrado repinta la seccion del boton que se presiono, no la vista activa.

## Facturas multiples en el Cuadre
- El campo "Vales / Facturas" dejo de ser un input unico: ahora es una lista
  donde se agrega cada factura con "Concepto u observacion" + importe (boton +
  o Enter). Sin limite de facturas.
- El TOTAL sigue guardandose en el campo `vales` (numero): la lista
  `facturas = [{concepto, importe}, ...]` es solo el desglose. Asi no cambia
  el calculo de la diferencia ni el modelo de datos.
- Retrocompatible: los cuadres viejos sin campo `facturas` se muestran igual
  (solo total). No hay migracion.
- Historial: el item muestra "Vales $X (N facturas)"; "Ver detalle" (.txt) y el
  CSV incluyen el desglose (CSV: columna "Detalle facturas" con
  `Concepto $importe | Concepto $importe`).
- Concepto vacio se muestra como "Sin concepto". Importe 0 o vacio se rechaza.

## Tills (cajas de $1,000)
- Cada till es una caja/cajon con un fondo fijo de $1,000 que se entrega al
  barista. Ese efectivo YA esta dentro del conteo por denominacion.
- La app captura solo la CANTIDAD de tills; el importe se calcula como
  `tillsCantidad * 1000` y se guarda en `tillsCantidad`, `tillBase` y `tills`.
- Los tills son un desglose informativo: NO se suman otra vez al efectivo
  contado ni cambian la formula de la diferencia
  (`declarado - (efectivoContado - vales)`).
- Se muestran arriba de Vales/Facturas, con subtotal y nota de que ya estan
  incluidas. El historial, el detalle .txt y el CSV tambien las incluyen.
- Retrocompatible: cuadres viejos sin tills se leen como 0, sin migracion.

## Como probarlo en la PC antes de subirlo
```bash
cd /home/mitsu/caja-stbx
python3 -m http.server 8000
# abrir http://localhost:8000
```
(OJO: el service worker necesita http/https, no funciona con `file://`.)

## Deploy a GitHub Pages
1. `git init` y `git add .` en esta carpeta.
2. Crear el repo en GitHub y `git remote add origin <url>`, `git push -u origin main`.
3. En el repo: **Settings > Pages > Source: Deploy from a branch**, rama
   `main`, carpeta `/ (root)`. Guardar.
4. En 1-2 minutos queda en `https://<usuario>.github.io/<repo>/`.
5. En el celular: abrir esa URL en Chrome y usar "Agregar a pantalla de inicio"
   para instalarla. Funciona sin internet despues de la primera visita.

## Como retomar manana
Abrir opencode en /home/mitsu/caja-stbx y decir: "sigue el plan de PLAN.md y arranca".