const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const VISTAS = ['cuadre', 'historial', 'prestamos', 'tickets', 'tiendas'];

const money = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const txt = Math.abs(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? '-$' : '$') + txt;
};

const denom = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const num = (v) => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const fechaCorta = (iso) => {
  if (!iso) return '';
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
};

function avisar(msg) {
  const a = $('#aviso');
  a.textContent = msg;
  a.classList.add('ver');
  clearTimeout(avisar._t);
  avisar._t = setTimeout(() => a.classList.remove('ver'), 3200);
}

function descargar(nombre, texto, tipo) {
  const blob = new Blob([texto], { type: (tipo || 'text/csv') + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csv(encabezados, filas) {
  const escCsv = (v) => {
    const s = String(v == null ? '' : v);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [encabezados.map(escCsv).join(';')].concat(filas.map((f) => f.map(escCsv).join(';'))).join('\n');
}

/* ================= NAVEGACION ================= */

let vistaActual = 'cuadre';

const PINTORES = {
  historial: () => Historial.pintar(),
  prestamos: () => Prestamos.pintar(),
  tickets: () => Tickets.pintar(),
  tiendas: () => Tiendas.pintar()
};

function pintarVista(vista) {
  if (PINTORES[vista]) PINTORES[vista]();
}

function pintarActual() {
  pintarVista(vistaActual);
}

function irA(vista) {
  vistaActual = VISTAS.includes(vista) ? vista : 'cuadre';
  VISTAS.forEach((v) => $('#vista-' + v).classList.toggle('oculto', v !== vistaActual));
  $$('nav.tabs button').forEach((b) => b.classList.toggle('activo', b.dataset.vista === vistaActual));
  if (location.hash.slice(1) !== vistaActual) history.replaceState(null, '', '#' + vistaActual);
  pintarVista(vistaActual);
  window.scrollTo(0, 0);
}

$$('nav.tabs button').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));
window.addEventListener('hashchange', () => irA(location.hash.slice(1)));

/* ================= CUADRE ================= */

const Cuadre = {
  conteos: {},

  init() {
    $('#c-fecha').value = DB.hoy();
    this.pintarDenominaciones();
    ['#c-vales', '#c-declarado'].forEach((s) => $(s).addEventListener('input', () => this.recalcular()));
    $('#c-guardar').addEventListener('click', () => this.guardar());
    $('#c-limpiar').addEventListener('click', () => this.limpiar());
  },

  pintarDenominaciones() {
    const cont = $('#c-denominaciones');
    this.conteos = {};
    cont.innerHTML = DB.denominaciones.todas().map((d) => {
      this.conteos[d] = 0;
      const de = esc(d);
      return '<div class="denominacion" data-den="' + de + '">' +
        '<span class="etq">$' + esc(denom(d)) + '</span>' +
        '<div class="ctrl">' +
          '<button type="button" data-acc="menos" aria-label="Quitar ' + de + '">−</button>' +
          '<input type="number" inputmode="numeric" min="0" step="1" value="0" data-den-input="' + de + '">' +
          '<button type="button" data-acc="mas" aria-label="Agregar ' + de + '">+</button>' +
        '</div>' +
        '<span class="sub" data-sub="' + de + '">$0.00</span>' +
      '</div>';
    }).join('');

    cont.querySelectorAll('button[data-acc]').forEach((b) => b.addEventListener('click', () => {
      const fila = b.closest('.denominacion');
      const d = fila.dataset.den;
      const input = fila.querySelector('input');
      const paso = b.dataset.acc === 'mas' ? 1 : -1;
      const nuevo = Math.max(0, (num(input.value) || 0) + paso);
      input.value = nuevo;
      this.actualizar();
    }));
    cont.querySelectorAll('input[data-den-input]').forEach((i) => i.addEventListener('input', () => this.actualizar()));
    this.recalcular();
  },

  actualizar() {
    $$('#c-denominaciones input[data-den-input]').forEach((i) => {
      const d = i.dataset.denInput;
      const cant = Math.max(0, Math.floor(num(i.value) || 0));
      i.value = cant;
      this.conteos[d] = cant;
      const sub = document.querySelector('[data-sub="' + d + '"]');
      if (sub) sub.textContent = money(d * cant);
    });
    this.recalcular();
  },

  recalcular() {
    let contado = 0;
    for (const d in this.conteos) contado += Number(d) * this.conteos[d];
    const vales = num($('#c-vales').value);
    const declarado = $('#c-declarado').value === '' ? null : num($('#c-declarado').value);
    const dif = declarado === null ? null : declarado - (contado - vales);

    $('#c-t-contado').textContent = money(contado);
    $('#c-t-vales').textContent = money(vales);
    $('#c-t-declarado').textContent = declarado === null ? '—' : money(declarado);

    const el = $('#c-t-dif');
    el.textContent = dif === null ? money(vales - contado) : money(dif);
    el.className = 'monto ' + (dif === null ? (vales - contado === 0 ? '' : 'neg') : dif === 0 ? '' : dif > 0 ? 'pos' : 'neg');

    const nota = $('#c-nota-dif');
    if (dif === null) {
      nota.textContent = 'Falta el monto declarado: el conteo de la otra persona. Capturalo para ver la diferencia.';
    } else if (dif === 0) {
      nota.textContent = 'Cuadre exacto: no hay diferencia.';
    } else {
      nota.textContent = dif > 0 ? 'Sobrante de ' + money(dif) + ' en caja.' : 'Faltante de ' + money(Math.abs(dif)) + ' en caja.';
    }
  },

  guardar() {
    const denoms = DB.denominaciones.todas().map((d) => ({ denominacion: d, cantidad: this.conteos[d] || 0 }));
    if (denoms.every((d) => !d.cantidad)) {
      avisar('Captura al menos un billete o moneda.');
      return;
    }
    const vales = num($('#c-vales').value);
    const declarado = $('#c-declarado').value === '' ? null : num($('#c-declarado').value);
    let contado = 0;
    denoms.forEach((d) => { contado += d.denominacion * d.cantidad; });

    DB.cuadres.guardar({
      fecha: $('#c-fecha').value || DB.hoy(),
      nombre: $('#c-nombre').value.trim(),
      turno: $('#c-turno').value,
      denominaciones: denoms,
      efectivoContado: contado,
      vales: vales,
      declarado: declarado,
      diferencia: declarado === null ? null : declarado - (contado - vales)
    });

    avisar('Cuadre guardado: diferencia ' + money(declarado === null ? vales - contado : declarado - (contado - vales)));
    this.limpiar();
  },

  limpiar() {
    this.pintarDenominaciones();
    $('#c-vales').value = '0';
    $('#c-declarado').value = '';
    $('#c-nombre').value = '';
    $('#c-turno').value = 'Apertura';
    $('#c-fecha').value = DB.hoy();
    this.recalcular();
  }
};

/* ================= HISTORIAL ================= */

const Historial = {
  filtro: 'todos',

  init() {
    $('#h-exportar').addEventListener('click', () => this.exportar());
  },

  lista() {
    const t = this.filtro;
    return DB.cuadres.todos().filter((c) => {
      if (t === 'faltantes') return c.diferencia !== null && c.diferencia < 0;
      if (t === 'sobrantes') return c.diferencia !== null && c.diferencia > 0;
      if (t === 'exacto') return c.diferencia === 0;
      if (t === 'semana') return new Date(c.fecha + 'T00:00:00').getTime() >= Date.now() - 6 * 864e5;
      return true;
    });
  },

  pintarFiltros() {
    const cont = $('#h-filtros');
    const opc = [['todos', 'Todos'], ['semana', 'Ultimos 7 dias'], ['faltantes', 'Faltantes'], ['sobrantes', 'Sobrantes'], ['exacto', 'Exactos']];
    if (cont.dataset.built !== '1') {
      cont.innerHTML = opc.map(([v, t]) => '<button class="chip" data-f="' + v + '">' + t + '</button>').join('');
      cont.addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        this.filtro = b.dataset.f;
        this.pintar();
      });
      cont.dataset.built = '1';
    }
    cont.querySelectorAll('.chip').forEach((b) => b.classList.toggle('activo', b.dataset.f === this.filtro));
  },

  pintarResumen() {
    const todos = DB.cuadres.todos();
    if (!todos.length) { $('#h-resumen').innerHTML = ''; return; }
    const dif = todos.map((c) => (c.diferencia === null ? c.vales - c.efectivoContado : c.diferencia));
    const suma = dif.reduce((a, b) => a + b, 0);
    const faltantes = dif.filter((d) => d < 0).reduce((a, b) => a + b, 0);
    const sobrantes = dif.filter((d) => d > 0).reduce((a, b) => a + b, 0);
    $('#h-resumen').innerHTML =
      '<div class="renglon"><span>Cuadres registrados</span><span class="monto">' + todos.length + '</span></div>' +
      '<div class="renglon"><span>Efectivo contado total</span><span class="monto">' + money(todos.reduce((a, c) => a + num(c.efectivoContado), 0)) + '</span></div>' +
      '<div class="renglon"><span>Total faltantes</span><span class="monto neg">' + money(faltantes) + '</span></div>' +
      '<div class="renglon"><span>Total sobrantes</span><span class="monto pos">' + money(sobrantes) + '</span></div>' +
      '<div class="renglon diferencia"><span>Diferencia acumulada</span><span class="monto ' + (suma < 0 ? 'neg' : suma > 0 ? 'pos' : '') + '">' + money(suma) + '</span></div>';
  },

  pintar() {
    this.pintarFiltros();
    this.pintarResumen();
    const datos = this.lista();
    const cont = $('#h-lista');
    if (!datos.length) {
      cont.innerHTML = '<div class="vacio"><span class="ico">🗂</span>Aun no hay cuadres en este filtro.</div>';
      return;
    }
    cont.innerHTML = datos.map((c) => {
      const dif = c.diferencia === null ? c.vales - c.efectivoContado : c.diferencia;
      const clase = dif === 0 ? '' : dif > 0 ? 'pos' : 'neg';
      const den = (c.denominaciones || []).filter((d) => d.cantidad > 0)
        .map((d) => '<div class="detalle-denom"><span>' + money(d.denominacion) + ' × ' + d.cantidad + '</span><span>' + money(d.denominacion * d.cantidad) + '</span></div>').join('');
      return '<div class="item">' +
        '<div class="cab"><div class="titulo">' + esc(fechaCorta(c.fecha)) + (c.turno ? ' · ' + esc(c.turno) : '') + '</div>' +
        '<span class="pill">Diferencia ' + money(dif) + '</span></div>' +
        (c.nombre ? '<div class="meta">' + esc(c.nombre) + '</div>' : '') +
        '<div class="detalle">Efectivo contado <b>' + money(c.efectivoContado) + '</b> · Vales <b>' + money(c.vales) + '</b> · Declarado <b>' + (c.declarado === null || c.declarado === undefined ? '—' : money(c.declarado)) + '</b></div>' +
        '<div class="detalle ' + clase + '">Diferencia: ' + money(dif) + (dif > 0 ? ' (sobrante)' : dif < 0 ? ' (faltante)' : ' (exacto)') + '</div>' +
        (den ? '<div class="mt">' + den + '</div>' : '') +
        '<div class="acciones"><button class="btn sec chico" data-ver="' + c.id + '">Ver detalle</button>' +
        '<button class="btn peligro chico" data-borrar="' + c.id + '">Borrar</button></div>' +
      '</div>';
    }).join('');
  },

  verDetalle(idCuadre) {
    const c = DB.cuadres.todos().find((x) => x.id === idCuadre);
    if (!c) return;
    const dif = c.diferencia === null ? c.vales - c.efectivoContado : c.diferencia;
    const filas = (c.denominaciones || []).map((d) =>
      '<div class="detalle-denom"><span>' + money(d.denominacion) + ' × ' + d.cantidad + '</span><span>' + money(d.denominacion * d.cantidad) + '</span></div>').join('');
    const texto =
      'CUADRE DE CAJA\n' +
      'Fecha: ' + c.fecha + '\n' +
      'Nombre: ' + (c.nombre || '-') + '\n' +
      'Turno: ' + (c.turno || '-') + '\n\n' +
      filas + '\n\n' +
      'Efectivo contado: ' + money(c.efectivoContado) + '\n' +
      'Vales/Facturas: ' + money(c.vales) + '\n' +
      'Declarado: ' + (c.declarado === null || c.declarado === undefined ? '-' : money(c.declarado)) + '\n' +
      'Diferencia: ' + money(dif) + '\n';
    descargar('cuadre_' + c.fecha + '_' + c.id + '.txt', texto, 'text/plain');
  },

  exportar() {
    const datos = DB.cuadres.todos();
    if (!datos.length) { avisar('No hay cuadres para exportar.'); return; }
    const denoms = DB.denominaciones.todas();
    const enc = ['Fecha', 'Nombre', 'Turno'].concat(denoms.map((d) => '$' + denom(d) + ' (billetes)'))
      .concat(['Efectivo contado', 'Vales/Facturas', 'Declarado', 'Diferencia']);
    const filas = datos.map((c) => {
      const mapa = {};
      (c.denominaciones || []).forEach((d) => { mapa[d.denominacion] = d.cantidad; });
      const dif = c.diferencia === null ? c.vales - c.efectivoContado : c.diferencia;
      return [c.fecha, c.nombre || '', c.turno || ''].concat(denoms.map((d) => mapa[d] || 0))
        .concat([c.efectivoContado, c.vales, c.declarado === null || c.declarado === undefined ? '' : c.declarado, dif]);
    });
    descargar('cuadres_' + DB.hoy() + '.csv', csv(enc, filas));
    avisar('CSV de cuadres descargado.');
  }
};

document.addEventListener('click', (e) => {
  const ver = e.target.closest('[data-ver]');
  if (ver) { Historial.verDetalle(ver.dataset.ver); return; }
  const b = e.target.closest('[data-borrar]');
  if (b) {
    const que = b.dataset.tipo || 'cuadre';
    if (que === 'tienda') {
      const idTienda = b.dataset.borrar;
      const nombre = DB.tiendas.nombreDe(idTienda) || idTienda;
      const afectados = DB.tiendas.prestamosDe(idTienda);
      if (afectados.length > 0) {
        const nombres = Array.from(new Set(afectados
          .map((p) => p.origen === idTienda ? p.origenNombre : p.destinoNombre)
          .filter(Boolean)));
        const congelados = nombres.length ? '"' + nombres.join('", "') + '"' : 'esa tienda';
        const msg = 'La tienda "' + nombre + '" aparece en ' + afectados.length + ' prestamo(s) registrado(s).\n\n' +
          'Los prestamos quedaran con "' + congelados + '" (el nombre con el que se registraron).\n\n' +
          'Si solo le cambiaste el nombre, cancela y usa Editar.\n\n¿Borrar de todos modos?';
        if (!confirm(msg)) return;
      } else if (!confirm('Borrar la tienda "' + nombre + '"?')) return;
      DB.tiendas.borrar(idTienda);
    } else {
      if (!confirm('Borrar este registro de forma permanente?')) return;
      if (que === 'prestamo') DB.prestamos.borrar(b.dataset.borrar);
      else if (que === 'ticket') DB.tickets.borrar(b.dataset.borrar);
      else DB.cuadres.borrar(b.dataset.borrar);
    }
    pintarSeccion(b);
  }
});

function pintarSeccion(el) {
  const sec = el.closest('section');
  const vista = sec ? sec.id.replace('vista-', '') : vistaActual;
  pintarVista(vista);
}

/* ================= PRESTAMOS ================= */

const Prestamos = {
  filtro: 'todos',
  editando: null,

  init() {
    $('#pr-fecha').value = DB.hoy();
    $('#pr-guardar').addEventListener('click', () => this.guardar());
    $('#pr-cancelar').addEventListener('click', () => this.cancelarEdicion());
    $('#pr-exportar').addEventListener('click', () => this.exportar());
  },

  llenarSelects() {
    const tiendas = DB.tiendas.todas();
    const opts = tiendas.map((t) => '<option value="' + esc(t.id) + '">' + esc(t.nombre) + ' (' + esc(t.id) + ')</option>').join('');
    $('#pr-origen').innerHTML = opts;
    $('#pr-destino').innerHTML = opts;
  },

  lista() {
    const t = this.filtro;
    if (t === 'pendientes') return DB.prestamos.todos().filter((p) => p.estado === 'Pendiente');
    if (t === 'devueltos') return DB.prestamos.todos().filter((p) => p.estado === 'Devuelto');
    return DB.prestamos.todos();
  },

  pintar() {
    this.llenarSelects();
    const cont = $('#pr-filtros');
    if (cont.dataset.built !== '1') {
      cont.innerHTML = [['todos', 'Todos'], ['pendientes', 'Pendientes'], ['devueltos', 'Devueltos']]
        .map(([v, t]) => '<button class="chip" data-f="' + v + '">' + t + '</button>').join('');
      cont.addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        this.filtro = b.dataset.f;
        this.pintar();
      });
      cont.dataset.built = '1';
    }
    cont.querySelectorAll('.chip').forEach((b) => b.classList.toggle('activo', b.dataset.f === this.filtro));

    const datos = this.lista();
    const lista = $('#pr-lista');
    if (!datos.length) {
      lista.innerHTML = '<div class="vacio"><span class="ico">🤝</span>No hay prestamos en este filtro.</div>';
      return;
    }
    const pendiente = datos.filter((p) => p.estado === 'Pendiente').reduce((a, p) => a + num(p.importe), 0);
    lista.innerHTML = (pendiente > 0
      ? '<div class="card"><div class="renglon"><span>Total pendiente</span><span class="monto neg">' + money(pendiente) + '</span></div></div>'
      : '') + datos.map((p) => {
      const clase = p.estado === 'Devuelto' ? 'devuelto' : 'pendiente';
      const pill = p.estado === 'Devuelto' ? 'devuelto' : 'pendiente';
      return '<div class="item ' + clase + '">' +
        '<div class="cab"><div class="titulo">' + money(p.importe) + '</div><span class="pill ' + pill + '">' + esc(p.estado) + '</span></div>' +
        '<div class="meta">' + esc(fechaCorta(p.fecha)) + ' · ' + esc(DB.tiendas.etiqueta(p.origen, p.origenNombre)) + ' → ' + esc(DB.tiendas.etiqueta(p.destino, p.destinoNombre)) + '</div>' +
        (p.concepto ? '<div class="nota">' + esc(p.concepto) + '</div>' : '') +
        '<div class="acciones">' +
          (p.estado === 'Pendiente' ? '<button class="btn chico" data-dev="' + p.id + '">Marcar devuelto</button>' : '<button class="btn sec chico" data-pend="' + p.id + '">Reabrir</button>') +
          '<button class="btn sec chico" data-edi="' + p.id + '">Editar</button>' +
          '<button class="btn peligro chico" data-borrar="' + p.id + '" data-tipo="prestamo">Borrar</button>' +
        '</div></div>';
    }).join('');
  },

  guardar() {
    const importe = num($('#pr-importe').value);
    const origen = $('#pr-origen').value;
    const destino = $('#pr-destino').value;
    if (importe <= 0) { avisar('Captura el importe del prestamo.'); return; }
    if (!origen || !destino) { avisar('Selecciona tienda origen y destino.'); return; }
    if (origen === destino) { avisar('El destino debe ser distinto al origen.'); return; }
    const datos = {
      fecha: $('#pr-fecha').value || DB.hoy(),
      origen: origen,
      origenNombre: DB.tiendas.nombreDe(origen),
      destino: destino,
      destinoNombre: DB.tiendas.nombreDe(destino),
      importe: importe,
      concepto: $('#pr-concepto').value.trim(),
      estado: $('#pr-estado').value
    };
    if (this.editando) {
      DB.prestamos.actualizar(this.editando, datos);
      avisar('Prestamo actualizado.');
    } else {
      DB.prestamos.guardar(datos);
      avisar('Prestamo registrado: ' + money(importe));
    }
    this.cancelarEdicion();
    this.pintar();
  },

  editar(idPrestamo) {
    const p = DB.prestamos.todos().find((x) => x.id === idPrestamo);
    if (!p) return;
    this.llenarSelects();
    this.editando = p.id;
    $('#pr-titulo').textContent = 'Editar prestamo';
    $('#pr-cancelar').classList.remove('oculto');
    $('#pr-fecha').value = p.fecha;
    $('#pr-importe').value = p.importe;
    $('#pr-origen').value = p.origen;
    $('#pr-destino').value = p.destino;
    $('#pr-concepto').value = p.concepto || '';
    $('#pr-estado').value = p.estado;
    window.scrollTo(0, 0);
  },

  cancelarEdicion() {
    this.editando = null;
    $('#pr-titulo').textContent = 'Nuevo prestamo';
    $('#pr-cancelar').classList.add('oculto');
    $('#pr-importe').value = '';
    $('#pr-concepto').value = '';
    $('#pr-fecha').value = DB.hoy();
    $('#pr-estado').value = 'Pendiente';
  },

  exportar() {
    const datos = DB.prestamos.todos();
    if (!datos.length) { avisar('No hay prestamos para exportar.'); return; }
    const enc = ['Fecha', 'Origen', 'CECO origen', 'Destino', 'CECO destino', 'Importe', 'Concepto', 'Estado'];
    const filas = datos.map((p) => {
      return [p.fecha, p.origenNombre || DB.tiendas.nombreDe(p.origen), p.origen,
              p.destinoNombre || DB.tiendas.nombreDe(p.destino), p.destino,
              p.importe, p.concepto || '', p.estado];
    });
    descargar('prestamos_' + DB.hoy() + '.csv', csv(enc, filas));
    avisar('CSV de prestamos descargado.');
  }
};

document.addEventListener('click', (e) => {
  const dev = e.target.closest('[data-dev]');
  if (dev) {
    DB.prestamos.actualizar(dev.dataset.dev, { estado: 'Devuelto', devuelto: DB.hoy() });
    avisar('Prestamo marcado como devuelto.');
    pintarSeccion(dev);
    return;
  }
  const pend = e.target.closest('[data-pend]');
  if (pend) {
    DB.prestamos.actualizar(pend.dataset.pend, { estado: 'Pendiente' });
    pintarSeccion(pend);
    return;
  }
  const edi = e.target.closest('[data-edi]');
  if (edi) { Prestamos.editar(edi.dataset.edi); return; }
});

/* ================= TICKETS ================= */

const Tickets = {
  filtro: 'todos',
  editando: null,

  init() {
    $('#tk-fecha').value = DB.hoy();
    $('#tk-guardar').addEventListener('click', () => this.guardar());
    $('#tk-cancelar').addEventListener('click', () => this.cancelarEdicion());
    $('#tk-exportar').addEventListener('click', () => this.exportar());
  },

  lista() {
    const t = this.filtro;
    if (t === 'abiertos') return DB.tickets.todos().filter((x) => x.estado === 'Abierto');
    if (t === 'curso') return DB.tickets.todos().filter((x) => x.estado === 'En curso');
    if (t === 'cerrados') return DB.tickets.todos().filter((x) => x.estado === 'Cerrado');
    return DB.tickets.todos();
  },

  pintar() {
    const cont = $('#tk-filtros');
    if (cont.dataset.built !== '1') {
      cont.innerHTML = [['todos', 'Todos'], ['abiertos', 'Abiertos'], ['curso', 'En curso'], ['cerrados', 'Cerrados']]
        .map(([v, t]) => '<button class="chip" data-f="' + v + '">' + t + '</button>').join('');
      cont.addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        this.filtro = b.dataset.f;
        this.pintar();
      });
      cont.dataset.built = '1';
    }
    cont.querySelectorAll('.chip').forEach((b) => b.classList.toggle('activo', b.dataset.f === this.filtro));

    const datos = this.lista();
    const lista = $('#tk-lista');
    if (!datos.length) {
      lista.innerHTML = '<div class="vacio"><span class="ico">🔧</span>No hay tickets en este filtro.</div>';
      return;
    }
    const abiertos = datos.filter((t) => t.estado !== 'Cerrado').length;
    lista.innerHTML = (abiertos ? '<div class="card"><div class="renglon"><span>Tickets sin cerrar</span><span class="monto">' + abiertos + '</span></div></div>' : '') +
      datos.map((t) => {
        const clase = t.estado === 'Cerrado' ? 'cerrado' : t.estado === 'En curso' ? 'encurso' : 'pendiente';
        const pill = t.estado === 'Cerrado' ? 'cerrado' : t.estado === 'En curso' ? 'encurso' : 'pendiente';
        const siguiente = t.estado === 'Abierto' ? 'En curso' : 'Cerrado';
        return '<div class="item ' + clase + '">' +
          '<div class="cab"><div class="titulo">' + esc(t.numero || 'Sin numero') + '</div><span class="pill ' + pill + '">' + esc(t.estado) + '</span></div>' +
          '<div class="meta">' + esc(fechaCorta(t.fecha)) + (t.equipo ? ' · ' + esc(t.equipo) : '') + '</div>' +
          (t.comentarios ? '<div class="nota">' + esc(t.comentarios) + '</div>' : '') +
          '<div class="acciones">' +
            (t.estado !== 'Cerrado' ? '<button class="btn chico" data-avanza="' + t.id + '" data-valor="' + siguiente + '">' + siguiente + '</button>' : '') +
            '<button class="btn sec chico" data-edi-t="' + t.id + '">Editar</button>' +
            '<button class="btn peligro chico" data-borrar="' + t.id + '" data-tipo="ticket">Borrar</button>' +
          '</div></div>';
      }).join('');
  },

  guardar() {
    const numero = $('#tk-numero').value.trim();
    const equipo = $('#tk-equipo').value.trim();
    if (!numero && !equipo && !$('#tk-comentarios').value.trim()) {
      avisar('Captura numero de ticket, equipo o comentarios.');
      return;
    }
    const datos = {
      fecha: $('#tk-fecha').value || DB.hoy(),
      numero: numero,
      equipo: equipo,
      estado: $('#tk-estado').value,
      comentarios: $('#tk-comentarios').value.trim()
    };
    if (this.editando) {
      DB.tickets.actualizar(this.editando, datos);
      avisar('Ticket actualizado.');
    } else {
      DB.tickets.guardar(datos);
      avisar('Ticket registrado: ' + (numero || equipo));
    }
    this.cancelarEdicion();
    this.pintar();
  },

  editar(idTicket) {
    const t = DB.tickets.todos().find((x) => x.id === idTicket);
    if (!t) return;
    this.editando = t.id;
    $('#tk-titulo').textContent = 'Editar ticket';
    $('#tk-cancelar').classList.remove('oculto');
    $('#tk-fecha').value = t.fecha;
    $('#tk-numero').value = t.numero || '';
    $('#tk-equipo').value = t.equipo || '';
    $('#tk-estado').value = t.estado;
    $('#tk-comentarios').value = t.comentarios || '';
    window.scrollTo(0, 0);
  },

  cancelarEdicion() {
    this.editando = null;
    $('#tk-titulo').textContent = 'Nuevo ticket';
    $('#tk-cancelar').classList.add('oculto');
    $('#tk-numero').value = '';
    $('#tk-equipo').value = '';
    $('#tk-comentarios').value = '';
    $('#tk-fecha').value = DB.hoy();
    $('#tk-estado').value = 'Abierto';
  },

  exportar() {
    const datos = DB.tickets.todos();
    if (!datos.length) { avisar('No hay tickets para exportar.'); return; }
    const enc = ['Fecha', 'Numero de ticket', 'Equipo', 'Estado', 'Comentarios'];
    const filas = datos.map((t) => [t.fecha, t.numero || '', t.equipo || '', t.estado, t.comentarios || '']);
    descargar('tickets_' + DB.hoy() + '.csv', csv(enc, filas));
    avisar('CSV de tickets descargado.');
  }
};

document.addEventListener('click', (e) => {
  const av = e.target.closest('[data-avanza]');
  if (av) {
    DB.tickets.actualizar(av.dataset.avanza, { estado: av.dataset.valor });
    avisar('Ticket: ' + av.dataset.valor);
    pintarSeccion(av);
    return;
  }
  const ediT = e.target.closest('[data-edi-t]');
  if (ediT) { Tickets.editar(ediT.dataset.ediT); }
});

/* ================= TIENDAS ================= */

const Tiendas = {
  editando: null,

  init() {
    $('#td-guardar').addEventListener('click', () => this.guardar());
    $('#td-cancelar').addEventListener('click', () => this.cancelarEdicion());
    $('#td-guardar-denoms').addEventListener('click', () => {
      const lista = $('#td-denoms').value.split(',').map((s) => s.trim()).filter(Boolean);
      if (!lista.length) { avisar('Escribe al menos una denominacion.'); return; }
      const invalidas = lista.filter((s) => !/^\d+(\.\d+)?$/.test(s));
      if (invalidas.length) { avisar('Solo numeros en las denominaciones. Revisa: ' + invalidas.slice(0, 3).join(', ')); return; }
      DB.denominaciones.guardar(lista);
      avisar('Denominaciones actualizadas.');
      Cuadre.pintarDenominaciones();
      this.pintarDenoms();
    });
  },

  pintarDenoms() {
    $('#td-denoms').value = DB.denominaciones.todas().join(', ');
  },

  pintar() {
    const tiendas = DB.tiendas.todas();
    const cont = $('#td-lista');
    cont.innerHTML = tiendas.length
      ? tiendas.map((t) => '<div class="item"><div class="cab"><div class="titulo">' + esc(t.nombre) + '</div><span class="pill">' + esc(t.id) + '</span></div>' +
        '<div class="acciones"><button class="btn sec chico" data-edi-td="' + esc(t.id) + '">Editar</button>' +
        '<button class="btn peligro chico" data-borrar="' + esc(t.id) + '" data-tipo="tienda">Borrar</button></div></div>').join('')
      : '<div class="vacio"><span class="ico">🏬</span>Sin tiendas en el catalogo.</div>';
  },

  guardar() {
    const idTienda = $('#td-id').value.trim();
    const nombre = $('#td-nombre').value.trim().toUpperCase();
    if (!nombre) { avisar('Escribe el nombre de la tienda.'); return; }
    if (!idTienda) { avisar('Escribe el CECO de la tienda.'); return; }
    const choque = DB.tiendas.todas().find((t) => t.id === idTienda && t.id !== this.editando);
    if (choque) { avisar('Ese CECO ya existe en ' + choque.nombre + '.'); return; }
    if (this.editando) {
      DB.tiendas.guardar({ id: this.editando, nombre: nombre });
      avisar('Tienda actualizada.');
    } else {
      DB.tiendas.guardar({ id: idTienda, nombre: nombre });
      avisar('Tienda agregada.');
    }
    this.cancelarEdicion();
    this.pintar();
  },

  editar(idTienda) {
    const t = DB.tiendas.todas().find((x) => x.id === idTienda);
    if (!t) return;
    this.editando = t.id;
    $('#td-titulo').textContent = 'Editar tienda';
    $('#td-cancelar').classList.remove('oculto');
    $('#td-id').value = t.id;
    $('#td-id').readOnly = true;
    $('#td-nombre').value = t.nombre;
    window.scrollTo(0, 0);
  },

  cancelarEdicion() {
    this.editando = null;
    $('#td-titulo').textContent = 'Nueva tienda';
    $('#td-cancelar').classList.add('oculto');
    $('#td-id').value = '';
    $('#td-id').readOnly = false;
    $('#td-nombre').value = '';
  }
};

document.addEventListener('click', (e) => {
  const ediTd = e.target.closest('[data-edi-td]');
  if (ediTd) Tiendas.editar(ediTd.dataset.ediTd);
});

/* ================= ARRANQUE ================= */

DB.init();
Cuadre.init();
Historial.init();
Prestamos.init();
Tickets.init();
Tiendas.init();
Tiendas.pintarDenoms();
irA(location.hash.slice(1) || 'cuadre');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
