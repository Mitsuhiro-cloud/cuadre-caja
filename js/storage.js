const KEYS = {
  cuadres: 'caja_cuadres',
  prestamos: 'caja_prestamos',
  tickets: 'caja_tickets',
  tiendas: 'caja_tiendas',
  denominaciones: 'caja_denominaciones'
};

const SEED_TIENDAS = [
  { id: '38408', nombre: 'BELISARIO DOMINGUEZ' },
  { id: '38525', nombre: 'TUXTLA II DT' },
  { id: '38738', nombre: 'PABELLON TUXTLA' },
  { id: '38781', nombre: 'SAN CRISTOBAL' },
  { id: '38839', nombre: 'TAPACHULA DT' },
  { id: '38946', nombre: 'PATIO TAPACHULA' },
  { id: '38966', nombre: 'COMITAN DT' },
  { id: '38967', nombre: 'BELISARIO DT' }
];

const SEED_DENOMINACIONES = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5];

function leer(clave, alterno) {
  try {
    const raw = localStorage.getItem(clave);
    if (!raw) return alterno;
    const datos = JSON.parse(raw);
    return Array.isArray(alterno) && !Array.isArray(datos) ? alterno : datos;
  } catch (e) {
    console.warn('No se pudo leer ' + clave, e);
    return alterno;
  }
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (e) {
    console.error('No se pudo guardar ' + clave, e);
    return false;
  }
}

function id() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function hoy() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mes + '-' + dia;
}

function ahora() {
  return new Date().toISOString();
}

const DB = {
  KEYS,
  id,
  hoy,
  ahora,

  init() {
    if (leer(KEYS.tiendas, null) === null) escribir(KEYS.tiendas, SEED_TIENDAS);
    if (leer(KEYS.denominaciones, null) === null) escribir(KEYS.denominaciones, SEED_DENOMINACIONES);
    for (const k of [KEYS.cuadres, KEYS.prestamos, KEYS.tickets]) {
      if (leer(k, null) === null) escribir(k, []);
    }
    DB.congelarNombres();
  },

  // Los prestamos antigos guardaban solo el CECO. Se congela el nombre actual
  // una unica vez, para que de aqui en adelante no dependan del catalogo.
  congelarNombres() {
    const prestamos = DB.prestamos.todos();
    if (!prestamos.length) return;
    let cambio = false;
    for (const p of prestamos) {
      if (p.origenNombre === undefined) { p.origenNombre = DB.tiendas.nombreDe(p.origen); cambio = true; }
      if (p.destinoNombre === undefined) { p.destinoNombre = DB.tiendas.nombreDe(p.destino); cambio = true; }
    }
    if (cambio) escribir(KEYS.prestamos, prestamos);
  },

  cuadres: {
    todos: () => leer(KEYS.cuadres, []),
    guardar(cuadre) {
      const lista = DB.cuadres.todos();
      const registro = Object.assign({}, cuadre, { id: id(), creado: ahora() });
      lista.unshift(registro);
      escribir(KEYS.cuadres, lista);
      return registro;
    },
    borrar(idCuadre) {
      escribir(KEYS.cuadres, DB.cuadres.todos().filter((c) => c.id !== idCuadre));
    }
  },

  prestamos: {
    todos: () => leer(KEYS.prestamos, []),
    guardar(prestamo) {
      const lista = DB.prestamos.todos();
      const registro = Object.assign({}, prestamo, { id: id(), creado: ahora() });
      lista.unshift(registro);
      escribir(KEYS.prestamos, lista);
      return registro;
    },
    actualizar(idPrestamo, cambios) {
      const lista = DB.prestamos.todos().map((p) =>
        p.id === idPrestamo ? Object.assign({}, p, cambios) : p
      );
      escribir(KEYS.prestamos, lista);
    },
    borrar(idPrestamo) {
      escribir(KEYS.prestamos, DB.prestamos.todos().filter((p) => p.id !== idPrestamo));
    }
  },

  tickets: {
    todos: () => leer(KEYS.tickets, []),
    guardar(ticket) {
      const lista = DB.tickets.todos();
      const registro = Object.assign({}, ticket, { id: id(), creado: ahora() });
      lista.unshift(registro);
      escribir(KEYS.tickets, lista);
      return registro;
    },
    actualizar(idTicket, cambios) {
      const lista = DB.tickets.todos().map((t) =>
        t.id === idTicket ? Object.assign({}, t, cambios) : t
      );
      escribir(KEYS.tickets, lista);
    },
    borrar(idTicket) {
      escribir(KEYS.tickets, DB.tickets.todos().filter((t) => t.id !== idTicket));
    }
  },

  tiendas: {
    todas: () => leer(KEYS.tiendas, SEED_TIENDAS),
    existe: (idTienda) => DB.tiendas.todas().some((t) => t.id === idTienda),
    guardar(tienda) {
      const lista = DB.tiendas.todas();
      if (tienda.id && lista.some((t) => t.id === tienda.id)) {
        escribir(KEYS.tiendas, lista.map((t) => (t.id === tienda.id ? Object.assign({}, t, tienda) : t)));
        return tienda;
      }
      const nueva = Object.assign({ id: id() }, tienda);
      lista.push(nueva);
      escribir(KEYS.tiendas, lista);
      return nueva;
    },
    borrar(idTienda) {
      escribir(KEYS.tiendas, DB.tiendas.todas().filter((t) => t.id !== idTienda));
    },
    nombreDe: (idTienda) => {
      const t = DB.tiendas.todas().find((x) => x.id === idTienda);
      return t ? t.nombre : '';
    },
    etiqueta: (idTienda, nombreCongelado) => {
      const congelado = nombreCongelado !== undefined ? nombreCongelado : DB.tiendas.nombreDe(idTienda);
      if (congelado) {
        const actual = DB.tiendas.nombreDe(idTienda);
        return actual ? congelado + ' (' + idTienda + ')' : congelado + ' (' + idTienda + ', tienda dada de baja)';
      }
      const t = DB.tiendas.todas().find((x) => x.id === idTienda);
      return t ? t.nombre + ' (' + t.id + ')' : 'Tienda eliminada';
    },
    prestamosDe: (idTienda) => DB.prestamos.todos().filter((p) => p.origen === idTienda || p.destino === idTienda)
  },

  denominaciones: {
    todas: () => leer(KEYS.denominaciones, SEED_DENOMINACIONES),
    guardar(lista) {
      escribir(KEYS.denominaciones, lista.map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => b - a));
    }
  },

  exportarTodo() {
    return {
      version: 1,
      exportado: ahora(),
      tiendas: DB.tiendas.todas(),
      denominaciones: DB.denominaciones.todas(),
      cuadres: DB.cuadres.todos(),
      prestamos: DB.prestamos.todos(),
      tickets: DB.tickets.todos()
    };
  }
};
