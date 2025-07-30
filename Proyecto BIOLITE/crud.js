// crud.js - CRUD simple con actualización optimista del DOM.
// Requiere que script.js ponga data-cols en .table-wrapper y data-row-enc (JSON URI encoded) en cada <tr>.

(function () {
  const ctx = {
    mainSection: null,
    ENDPOINTS: null,
    getState: null,   // () => { view, page, limit }
    loadView: null,   // (view, {page, limit}) => void
    WRITABLE: null,   // { Vista: boolean }
  };

  function init(opts) {
    Object.assign(ctx, opts || {});
  }

  function attach(mainSection) {
    if (ctx.mainSection === mainSection) return;
    ctx.mainSection = mainSection;

    // Seleccionar fila por clic
    mainSection.addEventListener("click", (e) => {
      const tr = e.target.closest(".table-wrapper tbody tr");
      if (!tr) return;
      if (e.target.closest("button")) return; // ignorar clics en botones de esa fila
      selectRow(tr);
    });

    // Toolbar (Agregar/Editar/Eliminar)
    mainSection.addEventListener("click", async (e) => {
      const addBtn = e.target.closest(".btn-add");
      const editBtn = e.target.closest(".btn-edit");
      const delBtnTop = e.target.closest(".btn-delete"); // el de la barra superior

      if (!addBtn && !editBtn && !delBtnTop) return;

      const { view } = ctx.getState();
      if (!isWritable(view)) return alert("Esta vista es de solo lectura por ahora.");

      // Obtener columnas y tbody
      const wrap = ctx.mainSection.querySelector(".table-wrapper");
      const cols = getCols(wrap);
      const tbody = wrap?.querySelector("tbody");

      if (addBtn) {
        const payload = await promptPayload(view, null);
        if (!payload) return;
        // API (no bloquea la actualización)
        void safeApi(() => create(view, payload));
        // Optimista: insertar nueva fila al inicio
        const newId = "temp_" + Date.now();
        const rowObj = { id: newId, ...payload };
        const tr = buildRow(cols, rowObj, view);
        tbody?.prepend(tr);
        // actualizar contador si existe
        incTotal(+1);
        // seleccionar nueva fila
        selectRow(tr);
        return;
      }

      if (editBtn) {
        const trSel = getSelectedRow();
        if (!trSel) return alert("Selecciona una fila primero.");
        const existing = parseRow(trSel);
        const payload = await promptPayload(view, existing);
        if (!payload) return;
        const id = (existing.id ?? existing.ID ?? "");
        void safeApi(() => update(view, id, payload));
        // Optimista: reemplazar contenido de la fila
        const updated = { ...existing, ...payload };
        const newTr = buildRow(cols, updated, view);
        trSel.replaceWith(newTr);
        selectRow(newTr);
        return;
      }

      if (delBtnTop) {
        const trSel = getSelectedRow();
        if (!trSel) return alert("Selecciona una fila primero.");
        if (!confirm("¿Eliminar el registro seleccionado?")) return;
        const existing = parseRow(trSel);
        const id = (existing.id ?? existing.ID ?? "");
        void safeApi(() => remove(view, id));
        // Optimista: quitar la fila
        trSel.remove();
        incTotal(-1);
        return;
      }
    });

    // Botón de basura dentro de la tabla
    mainSection.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".btn-delete-row");
      if (!delBtn) return;
      const tr = e.target.closest("tr");
      if (!tr) return;
      const { view } = ctx.getState();
      if (!isWritable(view)) return alert("Esta vista es de solo lectura por ahora.");
      if (!confirm("¿Eliminar este registro?")) return;
      const existing = parseRow(tr);
      const id = (existing.id ?? existing.ID ?? "");
      void safeApi(() => remove(view, id));
      tr.remove();
      incTotal(-1);
    });
  }

  /* ---------------- helpers DOM ---------------- */
  function getCols(wrapper) {
    try {
      const json = wrapper?.dataset?.cols || "[]";
      return JSON.parse(json);
    } catch { return []; }
  }

  function parseRow(tr) {
    try {
      const enc = tr.dataset.rowEnc || "";
      return JSON.parse(decodeURIComponent(enc)) || {};
    } catch {
      // Fallback: leer celdas por headers visibles
      const obj = {};
      const headers = Array.from(ctx.mainSection.querySelectorAll("thead th")).map(th => th.textContent.trim());
      Array.from(tr.children).forEach((td, i) => obj[headers[i]] = td.textContent);
      obj.id = tr.dataset.id || obj.id || obj.ID || "";
      return obj;
    }
  }

  function buildRow(cols, obj, view) {
    const tr = document.createElement("tr");
    tr.dataset.id = String(obj.id ?? obj.ID ?? "");
    tr.dataset.rowEnc = encodeURIComponent(JSON.stringify(obj));
    cols.forEach(col => {
      const td = document.createElement("td");
      td.textContent = obj[col] ?? "";
      tr.appendChild(td);
    });
    // Acciones (ícono basura) SOLO si vista tiene endpoint (script la usa así)
    if (hasApi(view)) {
      const td = document.createElement("td");
      td.innerHTML = `<button class="btn sm danger btn-delete-row" title="Eliminar" aria-label="Eliminar"><i class='bx bx-trash' aria-hidden="true"></i></button>`;
      tr.appendChild(td);
    }
    return tr;
  }

  function getSelectedRow() {
    return ctx.mainSection.querySelector(".table-wrapper tbody tr._selected");
  }

  function selectRow(tr) {
    ctx.mainSection.querySelectorAll(".table-wrapper tbody tr._selected").forEach(x => x.classList.remove("_selected"));
    tr.classList.add("_selected");
  }

  function incTotal(delta) {
    const info = ctx.mainSection.querySelector(".pagination .pagination-info");
    if (!info) return;
    const m = info.textContent.match(/•\s*(\d+)\s*registros/i);
    if (!m) return;
    const current = parseInt(m[1], 10);
    const next = Math.max(0, current + delta);
    info.textContent = info.textContent.replace(m[1], String(next));
  }

  /* ---------------- prompts por vista ---------------- */
  async function promptPayload(view, existing) {
    if (view === "Usuarios") {
      const name = prompt("Nombre:", existing?.name ?? "");
      if (name === null) return null;
      const email = prompt("Correo:", existing?.email ?? "");
      if (email === null) return null;
      return { name, email };
    }
    if (view === "Renuncia") {
      const title = prompt("Título:", existing?.title ?? "");
      if (title === null) return null;
      const body = prompt("Contenido:", existing?.body ?? "");
      if (body === null) return null;
      return { title, body };
    }
    if (view === "Departamento") {
      const nombre = prompt("Nombre:", existing?.nombre ?? "");
      if (nombre === null) return null;
      const jefe = prompt("Jefe:", existing?.jefe ?? "");
      if (jefe === null) return null;
      return { nombre, jefe };
    }
    // genérico
    const nombre = prompt("Nombre:", existing?.nombre ?? existing?.name ?? "");
    if (nombre === null) return null;
    return { nombre };
  }

  /* ---------------- llamadas HTTP (no bloqueantes) ---------------- */
  function hasApi(view) {
    return !!ctx.ENDPOINTS?.[view];
  }
  function isWritable(view) {
    return hasApi(view) && !!ctx.WRITABLE?.[view];
  }

  async function create(view, body) {
    const url = ctx.ENDPOINTS?.[view];
    if (!url) return;
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
  async function update(view, id, body) {
    const url = ctx.ENDPOINTS?.[view];
    if (!url) return;
    await fetch(`${url}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
  async function remove(view, id) {
    const url = ctx.ENDPOINTS?.[view];
    if (!url) return;
    await fetch(`${url}/${id}`, { method: "DELETE" });
  }

  async function safeApi(fn) {
    try { await fn(); } catch { /* ignoramos errores de demo */ }
  }

  window.CRUD = { init, attach };
})();
