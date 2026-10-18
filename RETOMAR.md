# RETOMAR AQUI (sesion siguiente)

Fecha: hoy (proyecto listo para desplegar).

## Estado
- El CODIGO de caja-stbx esta TERMINADO (todas las tareas del PLAN.md en ✓, 168 pruebas en verde).
- NO tiene .git todavia (nunca se inicio el repo). Falta SOLO el despliegue, no programar.

## Que seguir (en orden)
1. `git init` + `git add .` + commit inicial en esta carpeta.
2. Crear repo en GitHub (con `gh repo create` o desde la web) y `git remote add origin <url>`.
3. `git push -u origin main`.
4. GitHub Pages: Settings > Pages > Source: rama `main`, carpeta `/ (root)`. Guardar.
5. Poner la URL real en README.md (hoy dice "AGREGA TU URL AQUÍ").
6. Probar en el celular: abrir la URL en Chrome, "Agregar a pantalla de inicio" (PWA). Revisar que funcione offline.
7. OPCIONAL: en sw.js, actualizar `const CACHE = 'cuadre-caja-v2'` a `v3` cada vez que se modifique la app para no usar version vieja en caché.

## Proximas conversaciones pendientes (elegir luego)
- Explicar como "se instala" la app en el celular y el concepto PWA (service worker, offline).
- Actualizar el portafolio (Mitsuhiro.github.io) para que muestre la calculadora como proyecto estrella.
- Empezar React (despues del primer empleo o en paralelo, segun el plan).