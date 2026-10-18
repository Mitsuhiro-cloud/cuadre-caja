const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = __dirname;
const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'http://localhost/index.html',
  pretendToBeVisual: true
});

const { window } = dom;
const { document } = window;

// localStorage stub
const store = new Map();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  },
  configurable: true
});

window.confirm = () => true;
window.scrollTo = () => {};
window.alert = () => {};

const descargas = [];
window.URL.createObjectURL = () => 'blob:fake';
window.URL.revokeObjectURL = () => {};
const origCreate = document.createElement.bind(document);
document.createElement = (tag) => {
  const el = origCreate(tag);
  if (tag === 'a') {
    el.click = () => descargas.push({ nombre: el.download, href: el.href });
  }
  return el;
};

const SRC = fs.readFileSync(path.join(APP, 'js/storage.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(APP, 'js/app.js'), 'utf8') +
  '\n;({ DB, Cuadre, Historial, Prestamos, Tickets, Tiendas, irA, money, denom, csv, pintarActual });';

function arrancar(w) { return w.eval(SRC); }

const NS = arrancar(window);
const DB = NS.DB;
const Storage = DB;
const Cuadre = NS.Cuadre;
const Historial = NS.Historial;
const Prestamos = NS.Prestamos;
const Tickets = NS.Tickets;
const Tiendas = NS.Tiendas;
const irA = NS.irA;
const money = NS.money;
const denom = NS.denom;

let fallos = 0;
function check(nombre, cond, extra) {
  if (cond) console.log('  PASA  ' + nombre);
  else { console.log('  FALLA ' + nombre + (extra ? ' -> ' + extra : '')); fallos++; }
}

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

console.log('\n== SEMILLA ==');
check('8 tiendas del xlsm', Storage.tiendas.todas().length === 8, Storage.tiendas.todas().length);
check('CECO 38967 existe', !!Storage.tiendas.todas().find((t) => t.id === '38967'));
check('denominaciones 11', Storage.denominaciones.todas().length === 11, Storage.denominaciones.todas().length);
check('denominaciones ordenadas desc', Storage.denominaciones.todas()[0] === 1000);
check('ya NO existen datos semilla de turnos', Storage.turnos === undefined && !Object.keys(Storage).includes('turnos'));
check('la clave caja_turnos ya no se usa', Storage.KEYS.turnos === undefined, Object.keys(Storage.KEYS));
check('arrays vacios iniciales', Storage.cuadres.todos().length === 0 && Storage.prestamos.todos().length === 0 && Storage.tickets.todos().length === 0);

console.log('\n== CUADRE: denominaciones ==');
check('etiqueta $0.50 no se rompe', document.querySelector('.denominacion[data-den="0.5"] .etq').textContent === '$0.50', document.querySelector('.denominacion[data-den="0.5"] .etq').textContent);
check('etiqueta $1000 sin decimales', document.querySelector('.denominacion[data-den="1000"] .etq').textContent === '$1000', document.querySelector('.denominacion[data-den="1000"] .etq').textContent);
check('11 filas de denominacion', $$('#c-denominaciones .denominacion').length === 11, $$('#c-denominaciones .denominacion').length);
check('ya NO hay datalist de nombres', !document.querySelector('#c-encargados'));
check('ya NO hay lista desplegable de DATOS semilla', $$('#vista-cuadre option').length === 2, $$('#vista-cuadre option').length);
check('un solo campo de texto (Nombre)', document.querySelectorAll('#vista-cuadre input[type="text"]').length === 1);
check('el campo se llama c-nombre', !!document.querySelector('#c-nombre'));
check('ya no existe c-encargado', !document.querySelector('#c-encargado'));
check('Turno es un select con Apertura y Cierre', (() => {
  const sel = document.querySelector('#c-turno');
  if (!sel) return false;
  const v = Array.from(sel.options).map((o) => o.value);
  return sel.tagName === 'SELECT' && v.length === 2 && v[0] === 'Apertura' && v[1] === 'Cierre';
})(), document.querySelector('#c-turno') ? document.querySelector('#c-turno').innerHTML : 'no existe');
check('Turno inicia en Apertura', document.querySelector('#c-turno').value === 'Apertura', document.querySelector('#c-turno').value);
check('Nombre acepta texto libre', (() => { const i = document.querySelector('#c-nombre'); i.value = 'Karla Ruiz'; return i.value === 'Karla Ruiz'; })());
$('#c-nombre').value = 'Paola';

console.log('\n== CUADRE: 2x500 + 3x100 + 4x20 + 10x5 + 6x2 + 3x1 + 11x0.50 ==');
const poner = (den, cant) => {
  const input = document.querySelector('[data-den-input="' + den + '"]');
  input.value = cant;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
};
poner(500, 2); poner(100, 3); poner(20, 4); poner(5, 10); poner(2, 6); poner(1, 3); poner(0.5, 11);
const contado = 2 * 500 + 3 * 100 + 4 * 20 + 10 * 5 + 6 * 2 + 3 * 1 + 11 * 0.5; // 1450.50
check('contado = 1450.50', $('#c-t-contado').textContent === '$1,450.50', $('#c-t-contado').textContent);
check('subtotal 500 correcto', document.querySelector('[data-sub="500"]').textContent === '$1,000.00', document.querySelector('[data-sub="500"]').textContent);
check('subtotal 0.50 correcto', document.querySelector('[data-sub="0.5"]').textContent === '$5.50', document.querySelector('[data-sub="0.5"]').textContent);

console.log('\n== CUADRE: botones +/- ==');
const btnMas = document.querySelector('.denominacion[data-den="1000"] button[data-acc="mas"]');
btnMas.click();
check('+ agrega 1 billete de 1000', document.querySelector('[data-den-input="1000"]').value === '1', document.querySelector('[data-den-input="1000"]').value);
check('total sube a 2450.50', $('#c-t-contado').textContent === '$2,450.50', $('#c-t-contado').textContent);
btnMas.click(); btnMas.click();
check('+ x3 mas = 3', document.querySelector('[data-den-input="1000"]').value === '3', document.querySelector('[data-den-input="1000"]').value);
const btnMenos = document.querySelector('.denominacion[data-den="1000"] button[data-acc="menos"]');
btnMenos.click(); btnMenos.click(); btnMenos.click(); btnMenos.click();
check('no baja de 0', document.querySelector('[data-den-input="1000"]').value === '0', document.querySelector('[data-den-input="1000"]').value);
check('vuelve a 1450.50', $('#c-t-contado').textContent === '$1,450.50', $('#c-t-contado').textContent);

console.log('\n== CUADRE: negative / fractional input sanitizado ==');
const inpNeg = document.querySelector('[data-den-input="100"]');
inpNeg.value = '-5';
inpNeg.dispatchEvent(new window.Event('input', { bubbles: true }));
check('cantidad negativa -> 0', inpNeg.value === '0', inpNeg.value);
inpNeg.value = '3.7';
inpNeg.dispatchEvent(new window.Event('input', { bubbles: true }));
check('fraccion -> floor 3', inpNeg.value === '3', inpNeg.value);

console.log('\n== CUADRE: vales / real / diferencia ==');
$('#c-vales').value = '95.50';
$('#c-vales').dispatchEvent(new window.Event('input', { bubbles: true }));
check('vales en pantalla', $('#c-t-vales').textContent === '$95.50', $('#c-t-vales').textContent);
check('sin Real la diferencia usa contado-vales', $('#c-t-dif').textContent === '-$1,355.00', $('#c-t-dif').textContent);
check('nota explica que falta el Declarado', /declarado/i.test($('#c-nota-dif').textContent) && !/\bReal\b/.test($('#c-nota-dif').textContent), $('#c-nota-dif').textContent);
$('#c-declarado').value = '1355';
$('#c-declarado').dispatchEvent(new window.Event('input', { bubbles: true }));
check('Declarado = 1355 da exacto', $('#c-t-dif').textContent === '$0.00', $('#c-t-dif').textContent);
check('clase sin color en 0', $('#c-t-dif').className.trim() === 'monto', $('#c-t-dif').className);
check('nota exacto', /exacto/i.test($('#c-nota-dif').textContent), $('#c-nota-dif').textContent);
$('#c-declarado').value = '1290';
$('#c-declarado').dispatchEvent(new window.Event('input', { bubbles: true }));
check('Declarado = 1290 -> -65 faltante', $('#c-t-dif').textContent === '-$65.00', $('#c-t-dif').textContent);
check('clase neg', $('#c-t-dif').className.includes('neg'));
check('nota faltante', /faltante/i.test($('#c-nota-dif').textContent), $('#c-nota-dif').textContent);

console.log('\n== RENOMBRE REAL -> DECLARADO ==');
check('el campo se llama c-declarado', !!document.querySelector('#c-declarado'));
check('ya no existe c-real', !document.querySelector('#c-real'));
check('la etiqueta dice Declarado', document.querySelector('label[for="c-declarado"]').textContent.indexOf('Declarado') === 0, document.querySelector('label[for="c-declarado"]').textContent);
check('el total dice Declarado', document.querySelector('#c-t-declarado') !== null && !document.querySelector('#c-t-real'));
check('el historial no dice "Real"', (() => { Historial.pintar(); return !/Real/.test($('#h-lista').textContent); })(), $('#h-lista').textContent.slice(0, 150));

console.log('\n== FORMATO DE MONEDA ==');
check('negativo antes del signo', money(-1234.5) === '-$1,234.50', money(-1234.5));
check('negativo chico', money(-65) === '-$65.00', money(-65));
check('cero', money(0) === '$0.00', money(0));
check('positivo', money(1450.5) === '$1,450.50', money(1450.5));

console.log('\n== CUADRE: guardar ==');
$('#c-nombre').value = 'Paola';
$('#c-turno').value = 'Cierre';
$('#c-fecha').value = '2026-09-30';
click($('#c-guardar'));
const c1 = Storage.cuadres.todos()[0];
check('1 cuadre guardado', Storage.cuadres.todos().length === 1, Storage.cuadres.todos().length);
check('efectivoContado correcto', c1.efectivoContado === contado, c1.efectivoContado);
check('vales guardados', c1.vales === 95.5);
check('declarado guardado', c1.declarado === 1290);
check('diferencia -65', c1.diferencia === -65, c1.diferencia);
check('nombre guardado', c1.nombre === 'Paola', c1.nombre);
check('turno guardado', c1.turno === 'Cierre', c1.turno);
check('ya no se guarda campo encargado', c1.encargado === undefined, c1.encargado);check('fecha guardada', c1.fecha === '2026-09-30');
check('form reiniciado tras guardar', $('#c-vales').value === '0' && $('#c-nombre').value === '', $('#c-nombre').value);
check('Turno vuelve a Apertura tras guardar', $('#c-turno').value === 'Apertura', $('#c-turno').value);
check('denominaciones reiniciadas', document.querySelector('[data-den-input="1000"]').value === '0', document.querySelector('[data-den-input="1000"]').value);
check('aviso visible', $('#aviso').classList.contains('ver'));
check('denoms guardadas', c1.denominaciones.length === 11 && c1.denominaciones.find((d) => d.denominacion === 0.5).cantidad === 11);

console.log('\n== CUADRE: guardar vacio avisa ==');
click($('#c-guardar'));
check('sigue habiendo 1 cuadre', Storage.cuadres.todos().length === 1);
check('aviso de error', /billete|moneda/i.test($('#aviso').textContent), $('#aviso').textContent);

console.log('\n== HISTORIAL ==');
Historial.pintar();
check('lista con 1 item', $$('#h-lista .item').length === 1, $$('#h-lista .item').length);
check('titulo lleva fecha y turno', $('#h-lista .item .titulo').textContent === '30/09/2026 · Cierre', $('#h-lista .item .titulo').textContent);
check('nombre en la meta del item', $('#h-lista .item .meta').textContent === 'Paola', $('#h-lista .item .meta').textContent);
check('historial distingue apertura y cierre', (() => {
  const t = $('#h-lista .item .titulo').textContent;
  return /· Cierre$/.test(t) || /· Apertura$/.test(t);
})(), $('#h-lista .item .titulo').textContent);
check('muestra faltante', /faltante/i.test($('#h-lista').textContent), $('#h-lista').textContent.slice(0,120));
check('resumen cuadres = 1', /Cuadres registrados/.test($('#h-resumen').textContent));
check('filtros construidos', $$('#h-filtros .chip').length === 5);

const seg = Historial.lista.bind(Historial);
Historial.filtro = 'faltantes';
check('filtro faltantes trae 1', seg().length === 1, seg().length);
Historial.filtro = 'sobrantes';
check('filtro sobrantes trae 0', seg().length === 0, seg().length);
Historial.filtro = 'semana';
check('filtro semana es subconjunto', Historial.filtro === 'semana' && Historial.lista().length <= Storage.cuadres.todos().length);
Historial.filtro = 'todos';
Historial.pintar();

console.log('\n== HISTORIAL: detalle y CSV ==');
descargas.length = 0;
irA('historial');
click($$('#h-lista [data-ver]')[0]);
check('descarga detalle .txt', descargas.length === 1 && /\.txt$/.test(descargas[0].nombre), JSON.stringify(descargas));
descargas.length = 0;
click($('#h-exportar'));
check('descarga cuadres.csv', descargas.length === 1 && /^cuadres_.*\.csv$/.test(descargas[0].nombre), JSON.stringify(descargas));

console.log('\n== HISTORIAL: borrar ==');
click($$('#h-lista [data-borrar]')[0]);
check('borrado', Storage.cuadres.todos().length === 0);
check('lista muestra vacio', /Aun no hay/.test($('#h-lista').textContent), $('#h-lista').textContent);
descargas.length = 0;
click($('#h-exportar'));
check('CSV sin datos avisa', /No hay/.test($('#aviso').textContent), $('#aviso').textContent);

// re-guardar un cuadre para las siguientes pruebas
$('#c-nombre').value = 'Karla';
$('#c-turno').value = 'Apertura';
poner(100, 2);
$('#c-vales').value = '0';
$('#c-vales').dispatchEvent(new window.Event('input', { bubbles: true }));
click($('#c-guardar'));

console.log('\n== PRESTAMOS ==');
Prestamos.pintar();
check('select origen con 8', $$('#pr-origen option').length === 8, $$('#pr-origen option').length);
$('#pr-origen').value = '38967';
$('#pr-destino').value = '38525';
$('#pr-fecha').value = '2026-09-20';
$('#pr-importe').value = '2500';
$('#pr-concepto').value = 'Faltante de caja; "comillas" y coma,';
click($('#pr-guardar'));
check('1 prestamo guardado', Storage.prestamos.todos().length === 1);
check('estado Pendiente', Storage.prestamos.todos()[0].estado === 'Pendiente');
check('importe numerico', Storage.prestamos.todos()[0].importe === 2500);
check('item en lista', $$('#pr-lista .item').length === 1, $$('#pr-lista .item').length);
check('total pendiente', /Total pendiente/.test($('#pr-lista').textContent));
check('form limpio', $('#pr-importe').value === '');

console.log('\n== PRESTAMOS: validaciones ==');
$('#pr-origen').value = '38967';
$('#pr-destino').value = '38967';
$('#pr-importe').value = '100';
click($('#pr-guardar'));
check('mismo origen/destino rechazado', Storage.prestamos.todos().length === 1 && /distinto/i.test($('#aviso').textContent), $('#aviso').textContent);
$('#pr-destino').value = '38525';
$('#pr-importe').value = '0';
click($('#pr-guardar'));
check('importe 0 rechazado', Storage.prestamos.todos().length === 1 && /importe/i.test($('#aviso').textContent), $('#aviso').textContent);
$('#pr-importe').value = '700';
click($('#pr-guardar'));
check('segundo prestamo ok', Storage.prestamos.todos().length === 2);

console.log('\n== PRESTAMOS: marcar devuelto / reabrir ==');
Prestamos.pintar();
const idPend = Storage.prestamos.todos().find((p) => p.estado === 'Pendiente').id;
click(document.querySelector('[data-dev="' + idPend + '"]'));
check('estado Devuelto', Storage.prestamos.todos().find((p) => p.id === idPend).estado === 'Devuelto');
check('guarda fecha de devolucion', !!Storage.prestamos.todos().find((p) => p.id === idPend).devuelto);
Prestamos.pintar();
check('reparte 1 devuelto / 1 pendiente', (() => { const t = Storage.prestamos.todos(); return t.filter((p) => p.estado === 'Devuelto').length === 1 && t.filter((p) => p.estado === 'Pendiente').length === 1; })());
click(document.querySelector('[data-pend="' + idPend + '"]'));
check('reabierto a Pendiente', Storage.prestamos.todos().find((p) => p.id === idPend).estado === 'Pendiente');
Prestamos.pintar();
check('ya no hay boton data-pend', !document.querySelector('[data-pend]'));

console.log('\n== PRESTAMOS: editar y filtros ==');
click(document.querySelector('[data-edi]'));
check('modo edicion activo', $('#pr-titulo').textContent === 'Editar prestamo' && !$('#pr-cancelar').classList.contains('oculto'));
check('carga importe', $('#pr-importe').value === '700', $('#pr-importe').value);
$('#pr-importe').value = '950';
click($('#pr-guardar'));
check('importe actualizado', Storage.prestamos.todos().find((p) => p.importe === 950), 'no actualizado');
check('no creo duplicado', Storage.prestamos.todos().length === 2, Storage.prestamos.todos().length);
check('vuelve a modo nuevo', $('#pr-titulo').textContent === 'Nuevo prestamo');
Prestamos.pintar();
check('filtros prestamo', $$('#pr-filtros .chip').length === 3);
Prestamos.filtro = 'devueltos';
Prestamos.pintar();
check('filtro devueltos = 0 muestra vacio', $$('#pr-lista .item').length === 0, $$('#pr-lista .item').length);
Prestamos.filtro = 'pendientes';
Prestamos.pintar();
check('filtro pendientes = 2', $$('#pr-lista .item').length === 2, $$('#pr-lista .item').length);
Prestamos.filtro = 'todos';
Prestamos.pintar();

console.log('\n== PRESTAMOS: CSV ==');
descargas.length = 0;
click($('#pr-exportar'));
check('csv prestamos', descargas.length === 1 && /^prestamos_.*\.csv$/.test(descargas[0].nombre), JSON.stringify(descargas));

console.log('\n== PRESTAMOS: etiqueta de tienda ==');
check('etiqueta tienda', DB.tiendas.etiqueta('38967') === 'BELISARIO DT (38967)', DB.tiendas.etiqueta('38967'));
check('etiqueta inexistente', /eliminada/.test(DB.tiendas.etiqueta('X')));

console.log('\n== TICKETS ==');
Tickets.pintar();
$('#tk-numero').value = '38967-00239';
$('#tk-equipo').value = 'HORNO NUVU';
$('#tk-comentarios').value = 'Solicitud de refaccion\nmanija del horno';
$('#tk-fecha').value = '2026-09-15';
$('#tk-estado').value = 'Abierto';
click($('#tk-guardar'));
check('1 ticket guardado', Storage.tickets.todos().length === 1);
check('estado Abierto', Storage.tickets.todos()[0].estado === 'Abierto');
check('comentarios con salto de linea', /\n/.test(Storage.tickets.todos()[0].comentarios));
check('item en lista', $$('#tk-lista .item').length === 1);

$('#tk-numero').value = '38967-0258';
$('#tk-equipo').value = 'LICUADORAS';
$('#tk-estado').value = 'En curso';
click($('#tk-guardar'));
$('#tk-numero').value = '38967-00254';
$('#tk-equipo').value = 'RINSE MASTRENA II';
$('#tk-estado').value = 'Cerrado';
click($('#tk-guardar'));
check('3 tickets', Storage.tickets.todos().length === 3, Storage.tickets.todos().length);
check('sin cerrar = 2', /Tickets sin cerrar/.test($('#tk-lista').textContent));

console.log('\n== TICKETS: vacio rechazado ==');
click($('#tk-guardar'));
check('sigue en 3', Storage.tickets.todos().length === 3);
check('aviso de error', /Numero de ticket|equipo|comentarios/i.test($('#aviso').textContent), $('#aviso').textContent);

console.log('\n== TICKETS: avanzar estado ==');
Tickets.pintar();
const tAbierto = Storage.tickets.todos().find((t) => t.estado === 'Abierto');
click(document.querySelector('[data-avanza="' + tAbierto.id + '"]'));
check('Abierto -> En curso', Storage.tickets.todos().find((t) => t.id === tAbierto.id).estado === 'En curso');
Tickets.pintar();
click(document.querySelector('[data-avanza="' + tAbierto.id + '"]'));
check('En curso -> Cerrado', Storage.tickets.todos().find((t) => t.id === tAbierto.id).estado === 'Cerrado');
Tickets.pintar();
check('cerrado no avanza', !document.querySelector('[data-avanza="' + tAbierto.id + '"]'));

console.log('\n== TICKETS: editar y filtros ==');
Tickets.pintar();
click($$('#tk-lista [data-edi-t]')[0]);
check('modo edicion', $('#tk-titulo').textContent === 'Editar ticket' && !$('#tk-cancelar').classList.contains('oculto'));
check('carga numero', $('#tk-numero').value.length > 0);
$('#tk-equipo').value = 'HORNO NUVU REPARADO';
click($('#tk-guardar'));
check('no duplica', Storage.tickets.todos().length === 3);
check('equipo actualizado', Storage.tickets.todos().some((t) => t.equipo === 'HORNO NUVU REPARADO'));
Tickets.pintar();
Tickets.filtro = 'cerrados';
Tickets.pintar();
check('filtro cerrados = 2', $$('#tk-lista .item').length === 2, $$('#tk-lista .item').length);
Tickets.filtro = 'todos';
Tickets.pintar();
descargas.length = 0;
click($('#tk-exportar'));
check('csv tickets', descargas.length === 1 && /^tickets_.*\.csv$/.test(descargas[0].nombre), JSON.stringify(descargas));

console.log('\n== TIENDAS ==');
Tiendas.pintar();
check('8 tiendas en lista', $$('#td-lista .item').length === 8, $$('#td-lista .item').length);
$('#td-id').value = '39000';
$('#td-nombre').value = 'nueva tienda';
click($('#td-guardar'));
check('9 tiendas', Storage.tiendas.todas().length === 9, Storage.tiendas.todas().length);
check('nombre en mayusculas', Storage.tiendas.todas().some((t) => t.nombre === 'NUEVA TIENDA'));
$('#td-id').value = '39001';
$('#td-nombre').value = 'OTRA';
click($('#td-guardar'));
check('CECO duplicado rechazado', Storage.tiendas.todas().length === 10 || Storage.tiendas.todas().length === 9, Storage.tiendas.todas().length);
const extra = Storage.tiendas.todas().find((t) => t.id === '39000');
if (extra) {
  Tiendas.editar(extra.id);
  check('modo edicion tienda', $('#td-titulo').textContent === 'Editar tienda');
  $('#td-nombre').value = 'TIENDA RENOMBRADA';
  click($('#td-guardar'));
  check('renombrada', Storage.tiendas.todas().some((t) => t.nombre === 'TIENDA RENOMBRADA'));
  check('CECO conservado 39000', Storage.tiendas.todas().some((t) => t.id === '39000' && t.nombre === 'TIENDA RENOMBRADA'));
}
Tiendas.pintar();
const nueva = Storage.tiendas.todas().find((t) => t.id === '39000');
if (nueva) {
  click(document.querySelector('[data-borrar="' + nueva.id + '"]'));
  check('borrada', !Storage.tiendas.todas().some((t) => t.id === '39000'));
}

console.log('\n== TIENDAS: denominaciones ==');
$('#td-denoms').value = '500, 200, 100, 50, 0.5';
click($('#td-guardar-denoms'));
check('denominaciones actualizadas', Storage.denominaciones.todas().join(',') === '500,200,100,50,0.5', Storage.denominaciones.todas().join(','));
check('vista cuadre se repinta', $$('#c-denominaciones .denominacion').length === 5, $$('#c-denominaciones .denominacion').length);
$('#td-denoms').value = '1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5';
click($('#td-guardar-denoms'));
check('restauradas 11', Storage.denominaciones.todas().length === 11);

console.log('\n== SEGURIDAD: denominaciones ==');
$('#td-denoms').value = '500, <img src=x>, 100';
click($('#td-guardar-denoms'));
check('no guarda denominacion invalida', Storage.denominaciones.todas().length === 11, Storage.denominaciones.todas().join(','));
check('avisa denominacion invalida', /numeros/i.test($('#aviso').textContent), $('#aviso').textContent);
$('#td-denoms').value = '500, 200';
click($('#td-guardar-denoms'));
check('guarda las validas si hay invalidas rechazadas', Storage.denominaciones.todas().join(',') === '500,200', Storage.denominaciones.todas().join(','));
Storage.denominaciones.guardar(['1000', '"><img id="pwn" src=x onerror="1">']);
Cuadre.pintarDenominaciones();
check('XSS de denominacion escapado', document.querySelector('#c-denominaciones #pwn') === null, $('#c-denominaciones').innerHTML.slice(0, 120));
$('#td-denoms').value = '1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5';
click($('#td-guardar-denoms'));
check('denominaciones restauradas tras pruebas', Storage.denominaciones.todas().length === 11);

console.log('\n== NAVEGACION ==');
const tabs = $$('nav.tabs button');
check('5 tabs', tabs.length === 5);
click(tabs[3]);
check('vista tickets visible', !$('#vista-tickets').classList.contains('oculto') && $('#vista-cuadre').classList.contains('oculto'));
check('tab activa', tabs[3].classList.contains('activo'));
check('hash actualizado', window.location.hash === '#tickets', window.location.hash);
click(tabs[4]);
check('vista tiendas', !$('#vista-tiendas').classList.contains('oculto'));
click(tabs[0]);
check('vuelve a cuadre', !$('#vista-cuadre').classList.contains('oculto') && $$('nav.tabs button.activo').length === 1);
irA('ruta-invalida');
check('ruta invalida -> cuadre', !$('#vista-cuadre').classList.contains('oculto'));

console.log('\n== PERSISTENCIA (recarga simulada) ==');
const antes = {
  cuadres: Storage.cuadres.todos().length,
  prestamos: Storage.prestamos.todos().length,
  tickets: Storage.tickets.todos().length,
  tiendas: Storage.tiendas.todas().length
};
// reinicia el contexto de pagina manteniendo localStorage
const html2 = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
const dom2 = new JSDOM(html2, { runScripts: 'outside-only', url: 'http://localhost/index.html', pretendToBeVisual: true });
const w2 = dom2.window;
const store2 = new Map(store);
Object.defineProperty(w2, 'localStorage', {
  value: {
    getItem: (k) => (store2.has(k) ? store2.get(k) : null),
    setItem: (k, v) => store2.set(k, String(v)),
    removeItem: (k) => store2.delete(k),
    clear: () => store2.clear()
  },
  configurable: true
});
w2.confirm = () => true;
w2.scrollTo = () => {};
const NS2 = arrancar(w2);
const S2 = NS2.DB;
check('cuadres persisten', S2.cuadres.todos().length === antes.cuadres, S2.cuadres.todos().length + ' vs ' + antes.cuadres);
check('prestamos persisten', S2.prestamos.todos().length === antes.prestamos);
check('tickets persisten', S2.tickets.todos().length === antes.tickets);
check('tiendas persisten (sin duplicar semilla)', S2.tiendas.todas().length === antes.tiendas, S2.tiendas.todas().length + ' vs ' + antes.tiendas);
check('denominaciones persisten', S2.denominaciones.todas().length === 11);
check('turno persiste entre recargas', S2.cuadres.todos()[0] && S2.cuadres.todos()[0].turno === 'Apertura', S2.cuadres.todos().map((c) => c.turno).join('/'));
check('nombre persiste entre recargas', S2.cuadres.todos()[0] && S2.cuadres.todos()[0].nombre === 'Karla', S2.cuadres.todos().map((c) => c.nombre).join('/'));
check('no se recrea caja_turnos al recargar', !Object.keys(S2.KEYS).includes('turnos'));
check('cuadre reinicia en 0', w2.document.querySelector('[data-den-input="1000"]').value === '0', w2.document.querySelector('[data-den-input="1000"]').value);
check('DB.init no resetea datos', w2.document.querySelector('#h-lista') !== null);

console.log('\n== CORRUPCION DE DATOS ==');
store2.set('caja_cuadres', '{no es json');
const dom3 = new JSDOM(html2, { runScripts: 'outside-only', url: 'http://localhost/index.html', pretendToBeVisual: true });
const w3 = dom3.window;
store2.set('caja_prestamos', 'null');
Object.defineProperty(w3, 'localStorage', {
  value: {
    getItem: (k) => (store2.has(k) ? store2.get(k) : null),
    setItem: (k, v) => store2.set(k, String(v)),
    removeItem: (k) => store2.delete(k),
    clear: () => store2.clear()
  },
  configurable: true
});
w3.confirm = () => true;
w3.scrollTo = () => {};
let ok = true;
try {
  arrancar(w3);
} catch (e) { ok = false; console.log('   excepcion: ' + e.message); }
check('sobrevive a JSON corrupto', ok);

console.log('\n== TIENDAS: CONGELAR NOMBRES ==');
// un prestamo nuevo debe copiar los nombres
Prestamos.pintar();
$('#pr-origen').value = '38967';
$('#pr-destino').value = '38738';
$('#pr-importe').value = '2500';
$('#pr-guardar').click();
const pf = Storage.prestamos.todos()[0];
check('el prestamo congela el nombre de origen', pf.origenNombre === 'BELISARIO DT', pf.origenNombre);
check('el prestamo congela el nombre de destino', pf.destinoNombre === 'PABELLON TUXTLA', pf.destinoNombre);
// renombrar la tienda no debe alterar el prestamo viejo
Storage.tiendas.guardar({ id: '38967', nombre: 'BELISARIO DT RENOMBRADO' });
Prestamos.pintar();
check('tras renombrar, el prestamo conserva el nombre viejo',
  $('#pr-lista .item .meta').textContent.includes('BELISARIO DT (38967)'),
  $('#pr-lista .item .meta').textContent);
check('no muestra el nombre nuevo', !$('#pr-lista .item .meta').textContent.includes('RENOMBRADO'));
// borrar la tienda conserva el nombre congelado
Storage.tiendas.borrar('38967');
Prestamos.pintar();
check('tras borrar la tienda, el prestamo conserva el nombre',
  $('#pr-lista .item .meta').textContent.includes('BELISARIO DT (38967, tienda dada de baja)'),
  $('#pr-lista .item .meta').textContent);
check('el prestamo NO dice "Tienda eliminada"', !$('#pr-lista').textContent.includes('Tienda eliminada'));
check('el prestamo sigue existiendo', Storage.prestamos.todos().some((x) => x.id === pf.id));

console.log('\n== TIENDAS: AVISO AL BORRAR ==');
const confVistos = [];
window.confirm = (m) => { confVistos.push(m); return true; };
Storage.tiendas.guardar({ id: '39000', nombre: 'TIENDA CON PRESTAMOS' });
Prestamos.pintar();
$('#pr-origen').value = '39000';
$('#pr-destino').value = '38738';
$('#pr-importe').value = '1000';
$('#pr-guardar').click();
Tiendas.pintar();

confVistos.length = 0;
click(document.querySelector('[data-borrar="39000"]'));
check('aviso menciona los prestamos afectados', confVistos.length > 0 && /1 prestamo/.test(confVistos[0]), confVistos[0]);
check('aviso sugiere Editar si solo era un renombramiento', /usa Editar/.test(confVistos[0] || ''), confVistos[0]);
check('la tienda si se borro tras confirmar', !Storage.tiendas.todas().some((t) => t.id === '39000'));
Prestamos.pintar();
check('el prestamo conserva el nombre tras el borrado', $('#pr-lista').textContent.includes('TIENDA CON PRESTAMOS'), $('#pr-lista').textContent.slice(0,150));

console.log('\n== TIENDAS: AVISO SIN PRESTAMOS ==');
Storage.tiendas.guardar({ id: '39001', nombre: 'TIENDA LIMPIA' });
Tiendas.pintar();
confVistos.length = 0;
click(document.querySelector('[data-borrar="39001"]'));
check('aviso simple si no hay prestamos', confVistos.length === 1 && !/prestamo\(s\) registrado/.test(confVistos[0]), confVistos[0]);

console.log('\n== TIENDAS: CANCELAR NO BORRA ==');
Storage.tiendas.guardar({ id: '39002', nombre: 'NO SE BORRA' });
Tiendas.pintar();
window.confirm = () => false;
const nAntes = Storage.tiendas.todas().length;
click(document.querySelector('[data-borrar="39002"]'));
check('si cancela, la tienda sigue', Storage.tiendas.todas().length === nAntes, nAntes + ' -> ' + Storage.tiendas.todas().length);
window.confirm = () => true;


console.log('\n' + (fallos === 0 ? '*** TODAS LAS PRUEBAS PASARON ***' : '*** ' + fallos + ' PRUEBAS FALLARON ***'));
process.exit(fallos === 0 ? 0 : 1);
