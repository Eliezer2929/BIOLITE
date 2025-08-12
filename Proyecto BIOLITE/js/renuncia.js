// renuncia.js
// Módulo para manejar Renuncias con conexión a empleados

(function () {
  // Constantes y estado inicial
  const LSK = "renuncias_data_v1"; // Clave para almacenamiento local de renuncias
  const EMP_API = "https://dummy.restapiexample.com/api/v1/employees";  // URL API empleados (puede cambiar)

  // Estado interno del módulo
  const state = {
    container: null,    // Elemento DOM contenedor donde se renderiza el módulo
    renuncias: [],      // Array con los datos de renuncias
    empleados: [],      // Array con datos de empleados (para mostrar nombres)
    page: 1,            // Página actual para paginación
    limit: 10,          // Límite de registros por página
    apiUrl: null,       // URL API para renuncias (si aplica)
  };

  // FUNCIONES DE LOCALSTORAGE PARA RENUNCIAS

  // Carga de renuncias desde localStorage
  function loadLS() {
    try {
      return JSON.parse(localStorage.getItem(LSK) || "[]");
    } catch {
      return [];
    }
  }
  // Guardar renuncias en localStorage
  function saveLS(data) {
    try {
      localStorage.setItem(LSK, JSON.stringify(data));
    } catch {}
  }

  // FUNCIONES PARA CONSUMIR API (GET renuncias y empleados)

  // Obtener renuncias desde API (si apiUrl configurada)
  async function apiGet() {
    if (!state.apiUrl) return null;
    try {
      const r = await fetch(state.apiUrl);
      if (!r.ok) throw new Error("GET " + r.status);
      const data = await r.json();
      return data.data || data; // Retorna array de renuncias
    } catch {
      return null;
    }
  }

  // Obtener empleados desde localStorage (simulando API)
  function apiGetEmpleados() {
    try {
      const ls = JSON.parse(localStorage.getItem("empleados_data_v1") || "[]");
      return Array.isArray(ls) ? ls : [];
    } catch {
      return [];
    }
  }

  // FUNCIONES SIMULADAS POST, PATCH, DELETE (localStorage)

  // Agregar nueva renuncia
  async function apiPost(obj) {
    obj.id = Date.now().toString(); // Generar ID único con timestamp
    state.renuncias.unshift(obj);   // Agregar al inicio del array
    saveLS(state.renuncias);        // Guardar en localStorage
    return obj;
  }

  // Editar renuncia existente por ID
  async function apiPatch(id, patch) {
    const idx = state.renuncias.findIndex(r => r.id == id);
    if (idx === -1) throw new Error("Renuncia no encontrada");
    state.renuncias[idx] = { ...state.renuncias[idx], ...patch };
    saveLS(state.renuncias);
    return state.renuncias[idx];
  }

  // Eliminar renuncia por ID
  async function apiDelete(id) {
    state.renuncias = state.renuncias.filter(r => r.id !== id);
    saveLS(state.renuncias);
  }

  // RENDERIZADO DE TABLA CON PAGINACIÓN

  // Genera el HTML de la tabla para la página actual
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
              <td>${empleadoNombre(r.employee_id)}</td> <!-- Mostrar nombre del empleado -->
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

  // Obtener nombre del empleado dado su ID (busca en state.empleados)
  function empleadoNombre(id) {
    const emp = state.empleados.find(e => e.id == id);
    return emp ? emp.employee_name || emp.name || "Desconocido" : "Desconocido";
  }

  // Generar HTML para controles de paginación y botón de agregar
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

  // Obtener subconjunto de filas para la página actual (paginación)
  function slicePage(rows, page, limit) {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }

  // MODAL para agregar/editar renuncia

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

    // Cerrar modal
    const close = () => overlay.remove();
    overlay.querySelector("#m-close").addEventListener("click", close);
    overlay.querySelector("#m-cancel").addEventListener("click", close);

    // Guardar datos al hacer clic en guardar
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

  // FUNCIONES PRINCIPALES DE RENDERIZADO

  // Renderizar la vista completa: tabla + paginación + botones + eventos
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

    // Calcular total páginas para paginación
    const totalPages = Math.max(1, Math.ceil(total / state.limit));
    const go = (p) => {
      state.page = Math.min(Math.max(1, p), totalPages);
      draw();
    };

    // Eventos botones paginación
    state.container.querySelector("#pag-first")?.addEventListener("click", () => go(1));
    state.container.querySelector("#pag-prev")?.addEventListener("click", () => go(state.page - 1));
    state.container.querySelector("#pag-next")?.addEventListener("click", () => go(state.page + 1));
    state.container.querySelector("#pag-last")?.addEventListener("click", () => go(totalPages));

    // Evento botón agregar renuncia
    state.container.querySelector("#btn-add")?.addEventListener("click", () => {
      openModal(null, async (newRen) => {
        await apiPost(newRen);
        state.page = 1;
        draw();
      });
    });

    // Eventos botones editar (abrir modal con datos)
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

    // Eventos botones eliminar (con confirmación)
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

  // Carga inicial de datos (empleados y renuncias)
  async function loadData() {
    // Cargar empleados desde localStorage para mostrar nombres y llenar select
    state.empleados = await apiGetEmpleados();
    console.log("Empleados cargados en estado:", state.empleados);

    // Intentar cargar renuncias desde API si existe apiUrl configurada
    if (state.apiUrl) {
      const apiData = await apiGet();
      if (apiData && apiData.length) {
        state.renuncias = apiData;
        saveLS(apiData);
        return apiData;
      }
    }

    // Si no hay API, cargar desde localStorage
    const ls = loadLS();
    if (ls.length) {
      state.renuncias = ls;
      return ls;
    }

    // Si no hay datos previos, inicializar con array vacío
    state.renuncias = [];
    return [];
  }

  // Función pública para renderizar el módulo en un contenedor dado
  async function render(container, opts = {}) {
    state.container = container;
    state.limit = typeof opts.limit === "number" && opts.limit > 0 ? opts.limit : 10;
    state.apiUrl = typeof opts.apiUrl === "string" ? opts.apiUrl : null;
    state.page = 1;

    await loadData();
    await draw();
  }

  // Exponer función render para uso externo
  window.RenunciasRender = render;
})();
