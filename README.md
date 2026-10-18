# Cuadre de Caja — PWA

Aplicación web instalable que reemplaza el archivo Excel usado para el control de
efectivo, los préstamos entre tiendas y los tickets de mantenimiento.

Detecta el problema con la hoja de cálculo: no funciona sin internet, no se adapta
al celular, es fácil de corromper al enviarlo por correo y no lleva historial
consultable. Esta app resuelve las cuatro cosas.

**Cero dependencias externas.** Solo HTML, CSS y JavaScript nativo. Sin frameworks,
sin CDN, sin paso de compilación.

---

## Vista rápida

| | |
|---|---|
| **Demo en vivo** | <!-- AGREGA TU URL AQUÍ --> |
| **Tecnologías** | HTML5 · CSS3 · JavaScript (ES6+) · PWA |
| **Peso total** | ~1,600 líneas de código |
| **Pruebas** | 163 automáticas, todas en verde |
| **Dependencias** | ninguna |

---

## Funcionalidades

### Cuadre de efectivo
- Conteo por denominación con botones `+` / `−` y campo numérico directo.
- Se aceptan decimales y se ignoran los negativos.
- Cálculo automático del efectivo contado.
- **Diferencia** contra el monto declarado por la otra persona.
- Nota que explica cómo se calculó la diferencia.

### Historial
- Lista de todos los cuadres guardados, con filtro por día.
- Detalle de cada cuadre: desglose por denominación.
- Resumen del filtro: total faltantes, total sobrantes, diferencia acumulada.
- Exportación a **CSV** (compatible con Excel).

### Préstamos entre tiendas
- Origen y destino seleccionados del catálogo de sucursales.
- Estados: Pendiente / Devuelto, con botón de marcar y reabrir.
- Total pendiente calculado en vivo.
- Filtros: Todos / Pendientes / Devueltos.
- Exportación a CSV.

### Tickets de mantenimiento
- Registro por tienda, equipo y estado.
- Estados: Abierto / En curso / Cerrado, con avance de un clic.
- Filtros por estado y exportación a CSV.

### Catálogo de tiendas
- 8 sucursales con su CECO, cargadas desde la hoja original.
- Alta, edición y baja de sucursales.
- **Edición de denominaciones** activas del conteo.

### Diseño
- Mobile-first, pensado para celular.
- Funciona **sin conexión** (ver PWA más abajo).
- Se instala en la pantalla de inicio como app nativa.

---

## Decisiones técnicas

### Los datos nunca se borran al editarlos
Un préstamo guarda el **nombre** de la tienda además de su CECO:

```js
{ origen: "38967", origenNombre: "BELISARIO DT" }
```

Si después se renombra o se da de baja la tienda, el préstamo histórico **conserva
el nombre con el que se registró**, en lugar de mostrar el nombre actual o
"tienda eliminada".

El CECO sigue siendo la llave real; el nombre congelado es un respaldo legible para
el historial. Los registros anteriores que solo guardaban el CECO se completan
automáticamente al abrir la app.

### Las denominaciones son inmutables
Cada cuadre guarda **su propia copia** de las denominaciones con las que se
contó. Cambiar la lista de denominaciones en la configuración no altera ningún
cuadre ya registrado.

### Sin datos perdidos ante corrupción
Si el almacenamiento local llega a contenido inválido, la app lo detecta, lo
reporta por consola y arranca con un almacén limpio en vez de romperse en blanco.

### Offline real
`sw.js` precachea todos los archivos en la instalación y los sirve desde caché
cuando no hay red. El `fetch` de respaldo mantiene la caché actualizada en segundo
plano.

---

## PWA

| Archivo | Para qué sirve |
|---|---|
| `manifest.webmanifest` | Permite instalar la app; íconos y colores de barra |
| `sw.js` | Service worker: cachea los archivos para uso sin conexión |
| `icono.svg` / `.png` | Íconos en distintos tamaños y variante *maskable* |

> **Al subir a GitHub Pages, cambia `const CACHE = 'cuadre-caja-v2'` a `v3`** en
> `sw.js` cada vez que modifiques la app. Si no, el navegador sigue sirviendo la
> versión anterior desde la caché y no verás tus cambios.

---

## Estructura

```
.
├── index.html              # Estructura de las 5 vistas
├── css/
│   └── style.css           # Estilos, paleta y responsive
├── js/
│   ├── storage.js          # LocalStorage, semillas y helpers
│   └── app.js              # Lógica de cada sección
├── sw.js                   # Service worker (offline)
├── manifest.webmanifest    # Configuración de instalación
├── icono.svg, *.png        # Íconos
├── test-app.js             # Suite de pruebas automatizadas
├── package.json            # Scripts: npm test / npm start
├── PLAN.md                 # Notas de arquitectura y decisiones
└── Cuadre de Fondo.xlsm    # Hoja original (referencia)
```

---

## Cómo correrlo

Los service workers no funcionan abriendo el archivo con doble clic. Necesitas un
servidor local:

```bash
npm start
# o equivalently:
python3 -m http.server 8000
```

Luego abre `http://localhost:8000`.

Alternativa con Node:

```bash
npx serve .
```

Para probarlo en el celular, ambos deben estar en la misma red Wi-Fi y usas la IP
de tu computadora: `http://192.168.X.X:8000`

---

## Pruebas

El proyecto incluye una suite de **163 pruebas automáticas** que verifican los
cálculos de efectivo, la validación de datos, el historial, los préstamos, los
tickets, el catálogo de tiendas, la migración de datos antiguos y la
accesibilidad de los colores de estado.

```bash
npm install     # instala jsdom (única dependencia, solo para pruebas)
npm test
```

Resultado esperado: `*** TODAS LAS PRUEBAS PASARON ***` (163 pruebas).

---

## Paleta y accesibilidad

Los cuatro colores de estado tienen significado y **no son decorativos**:

| Color | Significado |
|---|---|
| Verde | Sobrante / diferencia positiva |
| Rojo | Faltante / diferencia negativa |
| Ámbar | Préstamo pendiente |
| Azul | Ticket en curso |

Todos superan el mínimo de contraste **WCAG AA (4.5:1)** sobre el fondo crema de las
tarjetas, para que la app siga siendo legible en condiciones de poca luz.

---

## Tecnologías

HTML5 semántico · CSS3 (custom properties, flexbox, grid, `clamp`) · JavaScript ES6+
(arrow functions, template literals, destructuring, módulos) · LocalStorage · Service
Workers · Web App Manifest · CSV exportable.

---

## Aprendizajes

- **Manipulación del DOM** y eventos delegated para listas dinámicas
- **LocalStorage** como base de datos local, con validación ante datos corruptos
- **Diseño de datos**: cuándo congelar un valor y cuándo mantenerlo como referencia
- **PWA**: manifest, service worker, estrategia de caché
- **UX mobile-first** y accesibilidad de contraste
- **Git/GitHub** y despliegue en GitHub Pages

---

## Licencia

MIT
