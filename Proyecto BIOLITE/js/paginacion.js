// paginacion.js - módulo global sencillo de paginación
// Adjunta window.Paginacion con: init(opts), loadView(nombre, {page, limit}), getState()

(function () {
  const ctx = {
    ENDPOINTS: null,
    PAGINATION: null, // { Vista: { mode: 'server'|'client', pageParam, limitParam, totalHeader } }
    showLoading: null,
    showError: null,
    renderTable: null, // función de script.js: (nombreTabla, items, total, page, limit)
  };

  const state = { view: null, page: 1, limit: 10, total: 0, items: [] };

  function init(options) {
    Object.assign(ctx, options || {});
  }

  function getState() {
    // devolvemos una copia para evitar mutaciones externas accidentales
    return { view: state.view, page: state.page, limit: state.limit, total: state.total, items: state.items };
  }

  function buildUrlWithPagination(baseUrl, nombreTabla, page, limit) {
    const cfg = ctx.PAGINATION?.[nombreTabla];
    if (!cfg || cfg.mode !== "server") return baseUrl;
    let u;
    try { u = new URL(baseUrl); }
    catch { u = new URL(baseUrl, window.location.href); }
    u.searchParams.set(cfg.pageParam, String(page));
    u.searchParams.set(cfg.limitParam, String(limit));
    return u.toString();
  }

  async function fetchDatos(nombreTabla, page = 1, limit = 10) {
    const baseUrl = ctx.ENDPOINTS?.[nombreTabla];
    if (!baseUrl) return { items: null, total: 0 };

    const cfg = ctx.PAGINATION?.[nombreTabla];

    // Server-side
    if (cfg && cfg.mode === "server") {
      const url = buildUrlWithPagination(baseUrl, nombreTabla, page, limit);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const json = await resp.json();
      const arr = Array.isArray(json) ? json
        : (json && Array.isArray(json.data)) ? json.data
        : (json && Array.isArray(json.items)) ? json.items
        : (json ? [json] : []);

      const totalHeaderValue =
        resp.headers.get(cfg.totalHeader) ||
        resp.headers.get((cfg.totalHeader || "").toUpperCase());
      const total = totalHeaderValue
        ? Number(totalHeaderValue)
        : (page * limit + (arr.length === limit ? 1 : 0));

      return { items: arr, total: isNaN(total) ? arr.length : total };
    }

    // Client-side
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

  async function loadView(nombreTabla, { page = 1, limit = 10 } = {}) {
    state.view = nombreTabla;
    state.page = page;
    state.limit = limit;

    try {
      ctx.showLoading && ctx.showLoading();
      const { items, total } = await fetchDatos(nombreTabla, page, limit);
      state.items = items || [];
      state.total = total || 0;
      ctx.renderTable && ctx.renderTable(nombreTabla, state.items, state.total, state.page, state.limit);
    } catch (err) {
      ctx.showError && ctx.showError(nombreTabla, err);
    }
  }

  window.Paginacion = { init, loadView, getState };
})();
