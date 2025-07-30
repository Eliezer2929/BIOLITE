// solicitudes.js
// Vista "Solicitudes" con localStorage, paginación, Aceptar/Rechazar (icon-only) y API opcional.
// Pasa apiUrl en render(..., { apiUrl: "https://tu.api/solicitudes" }) si quieres backend real.

(function () {
  const LSK = "solicitudes_data_v1";

  const state = {
    container: null,
    rows: [],
    page: 1,
    limit: 10,
    apiUrl: null, // GET/POST/PATCH opcional
  };

  /* ---------- Utils ---------- */
  const cls = (estado) => {
    const e = (estado || "").toLowerCase();
    if (e.startsWith("aprob")) return "approved";
    if (e.includes("no")) return "denied";
    return "pending";
  };
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase().replace(/\./g, "");
  const nowDate = () => fmtDate(new Date());
  const nowTime = () => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  };

  /* ---------- Storage ---------- */
  const loadLS = () => { try { return JSON.parse(localStorage.getItem(LSK) || "[]"); } catch { return []; } };
  const saveLS = (rows) => { try { localStorage.setItem(LSK, JSON.stringify(rows)); } catch {} };

  /* ---------- Seed demo ---------- */
  function seedRows() {
    const base = [
      ["000125", "Christian Garcia", "Sia Latam", "Vacaciones", "No trabajadas (días)", "28 NOV 2024", "02 SEP 2025", "02 OCT 2025", "28 NOV 2024 10:12", "Admin", "Pendiente"],
      ["000151", "Adrian Garcia-Rech", "Sia Latam", "Permiso", "Horas", "03 DIC 2024", "14 ENE 2025", "14 ENE 2025", "03 DIC 2024 09:40", "Cristian Garcia", "Aprobado"],
      ["000205", "Cristian Garcia", "Ventas", "Enfermedad", "Días", "28 NOV 2024", "07 MAR 2025", "08 MAR 2025", "28 NOV 2024 12:20", "RH Supervisor", "No aprobado"],
    ];
    return base.map(b => ({
      id: b[0], nombre: b[1], nivel: b[2], categoria: b[3], tipo: b[4],
      fechaSolicitud: b[5], inicio: b[6], fin: b[7], fechaAccion: b[8], aprobadoPor: b[9], estado: b[10],
    }));
  }

  /* ---------- API opcional ---------- */
  async function apiGet()   { if (!state.apiUrl) return null; const r = await fetch(state.apiUrl); if (!r.ok) throw new Error("GET "+r.status); return r.json(); }
  async function apiPost(o) { if (!state.apiUrl) return null; const r = await fetch(state.apiUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)}); try{return await r.json();}catch{return null;} }
  async function apiPatch(id, patch){
    if (!state.apiUrl) return null;
    const url = state.apiUrl.replace(/\/$/,"") + "/" + encodeURIComponent(id);
    const r = await fetch(url,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});
    try{return await r.json();}catch{return null;}
  }

  /* ---------- Layout ---------- */
  function renderShell(container, tableHtml, paginationHtml) {
    container.innerHTML = `
      <div class="page-title"><i class='bx bx-task'></i> <span>Solicitudes</span></div>

      <div class="filter-bar">
        <div class="filter"><i class='bx bx-search'></i><input id="f-id" placeholder="Buscar por ID"></div>
        <div class="filter"><i class='bx bx-category'></i><select id="f-evento"><option>Eventualidades</option></select></div>
        <div class="filter"><i class='bx bx-git-branch'></i><select id="f-nivel"><option>Nivel organizacional</option></select></div>
        <div class="filter"><i class='bx bx-user'></i><select id="f-trab"><option>Trabajadores</option></select></div>
        <div class="filter"><i class='bx bx-detail'></i><select id="f-tipo"><option>Tipo de solicitud</option></select></div>
        <div class="filter"><i class='bx bx-filter'></i>
          <select id="f-estado">
            <option>Todos los estados</option><option>Pendiente</option><option>Aprobado</option><option>No aprobado</option>
          </select>
        </div>
        <div class="actions-right">
          <button class="btn"><i class='bx bx-upload'></i></button>
          <button class="btn"><i class='bx bx-download'></i></button>
          <button class="btn primary" id="btn-add"><i class='bx bx-plus'></i> Agregar</button>
        </div>
      </div>

      <div class="table-card">
        ${tableHtml}
      </div>

      ${paginationHtml}
    `;

    // Filtro rápido por estado (demo)
    container.querySelector("#f-estado")?.addEventListener("change", (e) => {
      state.page = 1; draw({ estado: e.target.value });
    });
  }

  function tableHTML(pageRows) {
    return `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Nivel organizacional</th><th>Solicitud</th>
            <th>Tipo</th><th>Fecha de solicitud</th><th>Inicio</th><th>Fin</th>
            <th>Fecha de acción</th><th>Aprobado por</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows.map(r => `
            <tr data-id="${r.id}">
              <td>${r.id}</td>
              <td>${r.nombre}</td>
              <td>${r.nivel}</td>
              <td>${r.categoria}</td>
              <td>${r.tipo}</td>
              <td>${r.fechaSolicitud}</td>
              <td>${r.inicio}</td>
              <td>${r.fin}</td>
              <td>${r.fechaAccion}</td>
              <td>${r.aprobadoPor}</td>
              <td><span class="badge ${cls(r.estado)}">${r.estado}</span></td>
              <td class="actions">
                <button class="btn-icon accept" title="Aprobar" aria-label="Aprobar" ${r.estado === "Aprobado" ? "disabled" : ""}>
                  <i class='bx bx-check'></i>
                </button>
                <button class="btn-icon reject" title="Rechazar" aria-label="Rechazar" ${r.estado === "No aprobado" ? "disabled" : ""}>
                  <i class='bx bx-x'></i>
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function paginationHTML(total, page, limit) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return `
      <div class="pagination">
        <button id="pag-first" ${page <= 1 ? "disabled" : ""}>«</button>
        <button id="pag-prev" ${page <= 1 ? "disabled" : ""}>‹</button>
        <span class="pagination-info">Página ${Math.min(page, totalPages)} de ${totalPages} • ${total} registros</span>
        <div style="margin-left:auto;display:flex;align-items:center;gap:.4rem;">
          <span style="color:#6b7280;font-size:.9rem;">Por página</span>
          <select id="sel-limit" style="border:1px solid #d1d5db;border-radius:10px;padding:.22rem .4rem;">
            ${[5,10,20,30].map(n=>`<option ${n===limit?"selected":""}>${n}</option>`).join("")}
          </select>
        </div>
        <button id="pag-next" ${page >= totalPages ? "disabled" : ""}>›</button>
        <button id="pag-last" ${page >= totalPages ? "disabled" : ""}>»</button>
      </div>
    `;
  }

  function slicePage(rows, page, limit) {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }

  function attachPaginationHandlers() {
    const total = getFilteredRows().length;
    const totalPages = Math.max(1, Math.ceil(total / state.limit));
    const go = (p) => { state.page = Math.min(Math.max(1, p), totalPages); draw(); };
    document.getElementById("pag-first")?.addEventListener("click", () => go(1));
    document.getElementById("pag-prev") ?.addEventListener("click", () => go(state.page - 1));
    document.getElementById("pag-next") ?.addEventListener("click", () => go(state.page + 1));
    document.getElementById("pag-last") ?.addEventListener("click", () => go(totalPages));
    document.getElementById("sel-limit")?.addEventListener("change", (e) => {
      state.limit = parseInt(e.target.value, 10) || state.limit; state.page = 1; draw();
    });
  }

  /* ---------- Modal Agregar (suave) ---------- */
  function openModal(onSave) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <header>
          <span>Solicitud</span>
          <button class="icon-btn" id="m-close" title="Cerrar"><i class='bx bx-x'></i></button>
        </header>
        <div class="body">
          <div class="grid-2">
            <div class="field">
              <label>Trabajador</label>
              <input id="m-nombre" placeholder="Andrea Díaz Calderón - 646546">
            </div>
            <div class="field">
              <label>Nivel organizacional</label>
              <input id="m-nivel" placeholder="Ej: Sia Latam" value="Sia Latam">
            </div>
            <div class="field">
              <label>Categoría</label>
              <select id="m-categoria">
                <option>Vacaciones</option>
                <option>Permiso</option>
                <option>Enfermedad</option>
                <option>Otro</option>
              </select>
            </div>
            <div class="field">
              <label>Tipo</label>
              <select id="m-tipo">
                <option>No trabajadas (días)</option>
                <option>Horas</option>
              </select>
            </div>
            <div class="field">
              <label>Fecha de inicio</label>
              <input type="date" id="m-inicio">
            </div>
            <div class="field">
              <label>Fecha de fin</label>
              <input type="date" id="m-fin">
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Nota</label>
              <textarea id="m-nota" rows="2" placeholder="Opcional"></textarea>
            </div>
            <div class="field" style="grid-column:1/-1;">
              <label>Archivo</label>
              <label class="file-chip">
                <input type="file" id="m-file" hidden>
                <i class='bx bx-cloud-upload'></i> Cargar archivo
              </label>
            </div>
          </div>
        </div>
        <div class="actions">
          <button class="btn ghost" id="m-cancel">Cancelar</button>
          <button class="btn primary" id="m-save">Guardar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector("#m-cancel").addEventListener("click", close);
    overlay.querySelector("#m-close").addEventListener("click", close);
    overlay.querySelector(".file-chip").addEventListener("click", () => overlay.querySelector("#m-file").click());
    overlay.querySelector("#m-save").addEventListener("click", async () => {
      const nombre = val("#m-nombre"), nivel = val("#m-nivel");
      const categoria = val("#m-categoria"), tipo = val("#m-tipo");
      const inicio = val("#m-inicio"), fin = val("#m-fin");
      if (!nombre || !inicio || !fin) return alert("Completa Trabajador, Inicio y Fin.");
      await onSave({ nombre, nivel, categoria, tipo, inicio, fin });
      close();
    });

    function val(sel){ return overlay.querySelector(sel).value.trim(); }
    function close(){ overlay.remove(); }
  }

  /* ---------- Acciones ---------- */
  function acceptRow(id) { updateRow(id, { estado: "Aprobado", aprobadoPor: "Admin", fechaAccion: `${nowDate()} ${nowTime()}` }); }
  function rejectRow(id) { updateRow(id, { estado: "No aprobado", aprobadoPor: "Admin", fechaAccion: `${nowDate()} ${nowTime()}` }); }
  async function updateRow(id, changes) {
    const idx = state.rows.findIndex(r => r.id == id);
    if (idx === -1) return;
    state.rows[idx] = { ...state.rows[idx], ...changes }; // optimista
    saveLS(state.rows);
    draw();
    try { await apiPatch(id, changes); } catch {}
  }

  /* ---------- Filtros ---------- */
  let lastFilter = { estado: "Todos los estados" };
  function getFilteredRows() {
    if (!lastFilter || !lastFilter.estado || lastFilter.estado === "Todos los estados") return state.rows;
    return state.rows.filter(r => r.estado === lastFilter.estado);
  }

  /* ---------- Render ---------- */
  function draw(filterOverride) {
    if (filterOverride) lastFilter = { ...lastFilter, ...filterOverride };

    const all = getFilteredRows();
    const pageRows = slicePage(all, state.page, state.limit);

    const table = tableHTML(pageRows);
    const pag   = paginationHTML(all.length, state.page, state.limit);
    renderShell(state.container, table, pag);

    attachPaginationHandlers();

    // Acciones por fila (icon-only)
    state.container.querySelectorAll(".btn-icon.accept").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.closest("tr")?.dataset.id;
        if (id) acceptRow(id);
      });
    });
    state.container.querySelectorAll(".btn-icon.reject").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.closest("tr")?.dataset.id;
        if (id) rejectRow(id);
      });
    });

    // Agregar
    state.container.querySelector("#btn-add")?.addEventListener("click", () => {
      openModal(async (payload) => {
        const id = String(Math.floor(100000 + Math.random()*899999));
        const nuevo = {
          id,
          nombre: payload.nombre,
          nivel: payload.nivel || "—",
          categoria: payload.categoria,
          tipo: payload.tipo,
          fechaSolicitud: nowDate(),
          inicio: fmtDate(payload.inicio),
          fin: fmtDate(payload.fin),
          fechaAccion: `${nowDate()} ${nowTime()}`,
          aprobadoPor: "—",
          estado: "Pendiente",
        };

        state.rows.unshift(nuevo);   // optimista
        saveLS(state.rows);
        state.page = 1;
        draw();

        try { await apiPost(nuevo); } catch {}
      });
    });
  }

  async function loadData() {
    if (state.apiUrl) {
      try { const data = await apiGet(); if (Array.isArray(data) && data.length) return data; } catch {}
    }
    const ls = loadLS();
    if (ls.length) return ls;
    const seeded = seedRows(); saveLS(seeded); return seeded;
  }

  async function render(container, opts = {}) {
    state.container = container;
    state.limit = typeof opts.limit === "number" && opts.limit > 0 ? opts.limit : state.limit;
    state.apiUrl = typeof opts.apiUrl === "string" ? opts.apiUrl : null;
    state.page = 1;

    state.rows = await loadData();
    draw();
  }

  window.Solicitudes = { render };
})();
