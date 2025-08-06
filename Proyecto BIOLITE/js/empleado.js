// empleados.js

(function () {
  const LSK = "empleados_data_v1";

  const state = {
    container: null,
    rows: [],
    page: 1,
    limit: 10,
    apiUrl: null,
    dataLoaded: false,
  };

  function loadLS() {
    try {
      return JSON.parse(localStorage.getItem(LSK) || "[]");
    } catch {
      return [];
    }
  }

  function saveLS(rows) {
    try {
      localStorage.setItem(LSK, JSON.stringify(rows));
    } catch {}
  }

  async function apiGet() {
    if (!state.apiUrl) return [];
    try {
      const r = await fetch(state.apiUrl);
      if (!r.ok) throw new Error("GET " + r.status);
      const data = await r.json();
      return Array.isArray(data.data) ? data.data : data;
    } catch {
      return [];
    }
  }

  async function apiPost(obj) {
    obj.id = Date.now().toString();
    state.rows.unshift(obj);
    saveLS(state.rows);
    return obj;
  }

  async function apiPatch(id, patch) {
    const idx = state.rows.findIndex(r => r.id == id);
    if (idx === -1) throw new Error("Empleado no encontrado");
    state.rows[idx] = { ...state.rows[idx], ...patch };
    saveLS(state.rows);
    return state.rows[idx];
  }

  function renderTable(pageRows) {
    if (!pageRows.length) return `<p>No hay empleados para mostrar.</p>`;
    return `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Salario</th><th>Edad</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows.map(e => `
            <tr data-id="${e.id}">
              <td>${e.id}</td>
              <td>${e.employee_name}</td>
              <td>${e.employee_salary}</td>
              <td>${e.employee_age}</td>
              <td>
                <button class="btn-icon edit"><i class='bx bx-edit'></i></button>
                <button class="btn-icon delete"><i class='bx bx-trash'></i></button>
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
        <button id="pag-next" ${page >= totalPages ? "disabled" : ""}>›</button>
        <button id="pag-last" ${page >= totalPages ? "disabled" : ""}>»</button>
      </div>
      <button id="btn-add" class="btn primary" style="margin-top:1rem;">
        <i class='bx bx-plus'></i> Agregar Empleado
      </button>
    `;
  }

  function slicePage(rows, page, limit) {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }

  function openModal(data, onSave) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true">
        <header>
          <span>${data ? "Editar" : "Agregar"} Empleado</span>
          <button class="icon-btn" id="m-close"><i class='bx bx-x'></i></button>
        </header>
        <div class="body">
          <div class="field">
            <label>Nombre</label>
            <input id="m-name" type="text" value="${data?.employee_name || ""}">
          </div>
          <div class="field">
            <label>Salario</label>
            <input id="m-salary" type="number" value="${data?.employee_salary || ""}">
          </div>
          <div class="field">
            <label>Edad</label>
            <input id="m-age" type="number" value="${data?.employee_age || ""}">
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
      const employee_name = overlay.querySelector("#m-name").value.trim();
      const employee_salary = overlay.querySelector("#m-salary").value.trim();
      const employee_age = overlay.querySelector("#m-age").value.trim();
      if (!employee_name || !employee_salary || !employee_age) {
        alert("Completa todos los campos");
        return;
      }
      await onSave({ employee_name, employee_salary, employee_age });
      close();
    });
  }

  async function draw() {
    const total = state.rows.length;
    const pageRows = slicePage(state.rows, state.page, state.limit);
    const tableHtml = renderTable(pageRows);
    const pagHtml = paginationHTML(total, state.page, state.limit);

    state.container.innerHTML = `
      <h2>Empleado</h2>
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
      openModal(null, async (newEmp) => {
        await apiPost(newEmp);
        state.page = 1;
        draw();
      });
    });

    state.container.querySelectorAll("button.edit").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tr = e.currentTarget.closest("tr");
        const id = tr.dataset.id;
        const emp = state.rows.find(r => r.id === id);
        if (!emp) return alert("Empleado no encontrado");
        openModal(emp, async (upd) => {
          await apiPatch(id, upd);
          draw();
        });
      });
    });

    state.container.querySelectorAll("button.delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tr = e.currentTarget.closest("tr");
        const id = tr.dataset.id;
        if (confirm("¿Eliminar este empleado?")) {
          state.rows = state.rows.filter(r => r.id !== id);
          saveLS(state.rows);
          draw();
        }
      });
    });
  }

  async function loadData() {
    const apiData = await apiGet();
    const stored = loadLS();

    const combined = [
      ...apiData.filter(apiEmp => !stored.some(localEmp => localEmp.id === apiEmp.id)),
      ...stored
    ];

    state.rows = combined;
    saveLS(combined);
    state.dataLoaded = true;
  }

  // Función para esperar que los datos estén cargados (para otros módulos)
  async function waitForDataLoaded(maxRetries = 15, delay = 200) {
    for (let i = 0; i < maxRetries; i++) {
      if (state.dataLoaded && state.rows.length > 0) {
        return state.rows;
      }
      await new Promise(res => setTimeout(res, delay));
    }
    return []; // si no se cargan, retornar vacío
  }

  async function render(container, opts = {}) {
    state.container = container;
    state.limit = typeof opts.limit === "number" && opts.limit > 0 ? opts.limit : 10;
    state.apiUrl = typeof opts.apiUrl === "string" ? opts.apiUrl : null;
    state.page = 1;

    await loadData();
    await draw();
  }

  window.Empleados = {
    render,
    getData: () => state.rows,
    waitForDataLoaded,
  };


})();
