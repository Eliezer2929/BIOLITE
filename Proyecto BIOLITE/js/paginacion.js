// paginacion.js - módulo global sencillo de paginación
// Adjunta en window.Paginacion las funciones: init(opts), loadView(nombre, {page, limit}), getState()

(function () {
  // Contexto de configuración que se inyecta desde fuera con init()
  const ctx = {
    ENDPOINTS: null,     // URLs base por nombre de tabla, ej: { empleados: "https://..." }
    PAGINATION: null,    // Configuración por tabla: { Vista: { mode: 'server'|'client', pageParam, limitParam, totalHeader } }
    showLoading: null,   // Función callback para mostrar indicador de carga
    showError: null,     // Función callback para mostrar errores
    renderTable: null,   // Función callback (script.js) para renderizar la tabla: (nombreTabla, items, total, page, limit)
  };

  // Estado interno de la paginación actual
  const state = { view: null, page: 1, limit: 10, total: 0, items: [] };

  /**
   * Inicializa el módulo con las opciones de configuración necesarias
   * @param {Object} options - Objeto con ENDPOINTS, PAGINATION, showLoading, showError, renderTable
   */
  function init(options) {
    Object.assign(ctx, options || {});
  }

  /**
   * Devuelve una copia del estado interno actual (vista, página, límite, total, items)
   * Evita mutaciones externas accidentales.
   */
  function getState() {
    return { view: state.view, page: state.page, limit: state.limit, total: state.total, items: state.items };
  }

  /**
   * Construye una URL con parámetros de paginación para modo 'server'
   * @param {string} baseUrl - URL base del endpoint
   * @param {string} nombreTabla - Nombre de la vista/tabla
   * @param {number} page - Número de página
   * @param {number} limit - Límite de registros por página
   * @returns {string} URL con parámetros añadidos
   */
  function buildUrlWithPagination(baseUrl, nombreTabla, page, limit) {
    const cfg = ctx.PAGINATION?.[nombreTabla];
    if (!cfg || cfg.mode !== "server") return baseUrl;

    let u;
    try { 
      u = new URL(baseUrl); 
    } catch { 
      u = new URL(baseUrl, window.location.href); 
    }

    u.searchParams.set(cfg.pageParam, String(page));
    u.searchParams.set(cfg.limitParam, String(limit));
    return u.toString();
  }

  /**
   * Obtiene los datos paginados ya sea desde servidor (server-side) o filtrando en cliente (client-side)
   * @param {string} nombreTabla - Nombre de la tabla a consultar
   * @param {number} page - Página solicitada
   * @param {number} limit - Registros por página
   * @returns {Promise<{items: Array, total: number}>}
   */
  async function fetchDatos(nombreTabla, page = 1, limit = 10) {
    const baseUrl = ctx.ENDPOINTS?.[nombreTabla];
    if (!baseUrl) return { items: null, total: 0 };

    const cfg = ctx.PAGINATION?.[nombreTabla];

    // --- MODO SERVER-SIDE ---
    if (cfg && cfg.mode === "server") {
      const url = buildUrlWithPagination(baseUrl, nombreTabla, page, limit);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("HTTP " + resp.status);

      const json = await resp.json();

      // Adaptación de diferentes formatos de respuesta
      const arr = Array.isArray(json) ? json
        : (json && Array.isArray(json.data)) ? json.data
        : (json && Array.isArray(json.items)) ? json.items
        : (json ? [json] : []);

      // Obtención del total desde cabecera HTTP o cálculo estimado
      const totalHeaderValue =
        resp.headers.get(cfg.totalHeader) ||
        resp.headers.get((cfg.totalHeader || "").toUpperCase());

      const total = totalHeaderValue
        ? Number(totalHeaderValue)
        : (page * limit + (arr.length === limit ? 1 : 0));

      return { items: arr, total: isNaN(total) ? arr.length : total };
    }

    // --- MODO CLIENT-SIDE ---
    const resp = await fetch(baseUrl);
    if (!resp.ok) throw new Error("HTTP " + resp.status);

    const json = await resp.json();
    const all = Array.isArray(json) ? json
      : (json && Array.isArray(json.data)) ? json.data
      : (json && Array.isArray(json.items)) ? json.items
      : (json ? [json] : []);

    const total = all.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = all.slice(start, end);

    return { items, total };
  }

  /**
   * Carga una vista/tabla específica aplicando paginación y llama a renderTable()
   * @param {string} nombreTabla - Nombre de la tabla a renderizar
   * @param {{page?: number, limit?: number}} param1 - Configuración de paginación
   */
  async function loadView(nombreTabla, { page = 1, limit = 10 } = {}) {
    state.view = nombreTabla;
    state.page = page;
    state.limit = limit;

    try {
      ctx.showLoading && ctx.showLoading(); // Mostrar indicador de carga

      const { items, total } = await fetchDatos(nombreTabla, page, limit);
      state.items = items || [];
      state.total = total || 0;

      ctx.renderTable && ctx.renderTable(nombreTabla, state.items, state.total, state.page, state.limit);
    } catch (err) {
      ctx.showError && ctx.showError(nombreTabla, err);
    }
  }

  // Exponer API pública en el objeto global
  window.Paginacion = { init, loadView, getState };
})();
