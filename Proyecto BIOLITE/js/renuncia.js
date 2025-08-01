// renuncia.js
// Módulo para manejar Renuncias con conexión a empleados

(function () {
  const LSK = "renuncias_data_v1";
  const EMP_API = "https://dummy.restapiexample.com/api/v1/employees";  // Cambia si usas otra

  const state = {
    container: null,
    renuncias: [],
    empleados: [],
    page: 1,
    limit: 10,
    apiUrl: null,
  };

  // LocalStorage renuncias
  function loadLS() {
    try {
      return JSON.parse(localStorage.getItem(LSK) || "[]");
    } catch {
      return [];
    }
  }
  function saveLS(data) {
    try {
      localStorage.setItem(LSK, JSON.stringify(data));
    } catch {}
  }

  // API GET renuncias (si tienes) - si no, null
  async function apiGet() {
    if (!state.apiUrl) return null;
    try {
      const r = await fetch(state.apiUrl);
      if (!r.ok) throw new Error("GET " + r.status);
      const data = await r.json();
      return data.data || data;
    } catch {
      return null;
    }
  }

  // API GET empleados
  function apiGetEmpleados() {
    try {
      const ls = JSON.parse(localStorage.getItem("empleados_data_v1") || "[]");
      return Array.isArray(ls) ? ls : [];
    } catch {
      return [];
    }
  }




  // POST PATCH DELETE simulados en localStorage

  async function apiPost(obj) {
    obj.id = Date.now().toString();
    state.renuncias.unshift(obj);
    saveLS(state.renuncias);
    return obj;
  }

  async function apiPatch(id, patch) {
    const idx = state.renuncias.findIndex(r => r.id == id);
    if (idx === -1) throw new Error("Renuncia no encontrada");
    state.renuncias[idx] = { ...state.renuncias[idx], ...patch };
    saveLS(state.renuncias);
    return state.renuncias[idx];
  }

  async function apiDelete(id) {
    state.renuncias = state.renuncias.filter(r => r.id !== id);
    saveLS(state.renuncias);
  }

  // Render tabla paginada
  function renderTable(pageRows) {
    if (!pageRows.length) return `<p>No hay renuncias para mostrar.</p>`;

    return `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Empleado</th><th>Fecha</th><th>Razón</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows.map(r => `
            <tr data-id="${r.id}">
              <td>${r.id}</td>
              <td>${empleadoNombre(r.employee_id)}</td>
              <td>${r.fecha || ""}</td>
              <td>${r.razon || ""}</td>
              <td>
                <button class="btn-icon edit" title="Editar"><i class='bx bx-edit'></i></button>
                <button class="btn-icon delete" title="Eliminar"><i class='bx bx-trash'></i></button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // Obtener nombre del empleado dado su ID
  function empleadoNombre(id) {
    const emp = state.empleados.find(e => e.id == id);
    return emp ? emp.employee_name || emp.name || "Desconocido" : "Desconocido";
  }

  // Paginación simple
  function paginationHTML(total, page, limit) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return `
      <div class="pagination">
        <button id="pag-first" ${page <= 1 ? "disabled" : ""}>«</button>
        <button id="pag-prev" ${page <= 1 ? "disabled" : ""}>‹</button>
        <span class="pagination-info">Página ${Math.min(page, totalPages)} de ${totalPages} • ${total} registros</span>
        <button id="pag-next" ${page >= totalPages ? "disabled" : ""}>›</button>
        <button id="pag-last" ${page >= totalPages ? "disabled" : ""}>»</button>
      </div>
      <button id="btn-add" class="btn primary" style="margin-top:1rem;">
        <i class='bx bx-plus'></i> Agregar Renuncia
      </button>
    `;
  }

  function slicePage(rows, page, limit) {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }

  // Modal agregar/editar renuncia
  function openModal(data, onSave) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" style="max-width:400px;">
        <header>
          <span>${data ? "Editar" : "Agregar"} Renuncia</span>
          <button class="icon-btn" id="m-close" title="Cerrar"><i class='bx bx-x'></i></button>
        </header>
        <div class="body">
          <div class="field">
            <label>Empleado</label>
            <select id="m-employee">
              <option value="">-- Selecciona empleado --</option>
              ${state.empleados.length > 0
                ? state.empleados.map(e => `
                    <option value="${e.id}" ${data && e.id == data.employee_id ? "selected" : ""}>
                      ${e.employee_name || e.name}
                    </option>
                  `).join("")
                : `<option disabled>No hay empleados cargados</option>`
              }
            </select>

          </div>
          <div class="field">
            <label>Fecha</label>
            <input id="m-fecha" type="date" value="${data?.fecha || ""}">
          </div>
          <div class="field">
            <label>Razón</label>
            <textarea id="m-razon" rows="3" placeholder="Razón de la renuncia">${data?.razon || ""}</textarea>
          </div>
        </div>
        <div class="actions">
          <button class="btn ghost" id="m-cancel">Cancelar</button>
          <button class="btn primary" id="m-save">Guardar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector("#m-close").addEventListener("click", close);
    overlay.querySelector("#m-cancel").addEventListener("click", close);

    overlay.querySelector("#m-save").addEventListener("click", async () => {
      const employee_id = overlay.querySelector("#m-employee").value;
      const fecha = overlay.querySelector("#m-fecha").value.trim();
      const razon = overlay.querySelector("#m-razon").value.trim();
      if (!employee_id || !fecha || !razon) {
        alert("Completa todos los campos");
        return;
      }
      await onSave({ employee_id, fecha, razon });
      close();
    });
  }

  async function draw() {
    const total = state.renuncias.length;
    const pageRows = slicePage(state.renuncias, state.page, state.limit);
    const tableHtml = renderTable(pageRows);
    const pagHtml = paginationHTML(total, state.page, state.limit);

    state.container.innerHTML = `
      <h2>Renuncias</h2>
      ${tableHtml}
      ${pagHtml}
    `;

    const totalPages = Math.max(1, Math.ceil(total / state.limit));
    const go = (p) => {
      state.page = Math.min(Math.max(1, p), totalPages);
      draw();
    };

    state.container.querySelector("#pag-first")?.addEventListener("click", () => go(1));
    state.container.querySelector("#pag-prev")?.addEventListener("click", () => go(state.page - 1));
    state.container.querySelector("#pag-next")?.addEventListener("click", () => go(state.page + 1));
    state.container.querySelector("#pag-last")?.addEventListener("click", () => go(totalPages));

    state.container.querySelector("#btn-add")?.addEventListener("click", () => {
      openModal(null, async (newRen) => {
        await apiPost(newRen);
        state.page = 1;
        draw();
      });
    });

    state.container.querySelectorAll("button.edit").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tr = e.currentTarget.closest("tr");
        const id = tr.dataset.id;
        const ren = state.renuncias.find(r => r.id === id);
        if (!ren) return alert("Renuncia no encontrada");
        openModal(ren, async (upd) => {
          await apiPatch(id, upd);
          draw();
        });
      });
    });

    state.container.querySelectorAll("button.delete").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const tr = e.currentTarget.closest("tr");
        const id = tr.dataset.id;
        if (confirm("¿Eliminar esta renuncia?")) {
          await apiDelete(id);
          draw();
        }
      });
    });
  }

  async function loadData() {
    // Cargar empleados para mostrar nombres y select
    state.empleados = await apiGetEmpleados();
    console.log("Empleados cargados en estado:", state.empleados);


    // Cargar renuncias desde API o LS
    if (state.apiUrl) {
      const apiData = await apiGet();
      if (apiData && apiData.length) {
        state.renuncias = apiData;
        saveLS(apiData);
        return apiData;
      }
    }

    const ls = loadLS();
    if (ls.length) {
      state.renuncias = ls;
      return ls;
    }
    state.renuncias = [];
    return [];
  }

  async function render(container, opts = {}) {
    state.container = container;
    state.limit = typeof opts.limit === "number" && opts.limit > 0 ? opts.limit : 10;
    state.apiUrl = typeof opts.apiUrl === "string" ? opts.apiUrl : null;
    state.page = 1;

    await loadData();
    await draw();
  }

  window.RenunciasRender = render;
})();
