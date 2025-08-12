// departamento.js
// -----------------------------------------------------------------------------
// Este módulo gestiona la visualización de departamentos de forma paginada,
// obteniendo datos desde una API de prueba (https://dummyjson.com/users).
// Incluye funcionalidades de búsqueda, paginación y botones de edición/eliminación
// simulados (aún no implementados).
// -----------------------------------------------------------------------------

(function() {
  // URL base de la API
  const API = "https://dummyjson.com/users";

  // Estado interno del módulo
  const state = {
    container: null, // Contenedor HTML donde se renderiza el módulo
    rows: [],        // Datos de departamentos (simulados con usuarios)
    page: 1,         // Página actual
    limit: 10,       // Cantidad de elementos por página
    total: 0,        // Total de registros
    search: ""       // Texto de búsqueda
  };

  /**
   * Obtiene datos desde la API (paginado y con búsqueda opcional)
   * @param {string} q - Texto de búsqueda
   * @param {number} page - Página a obtener
   * @param {number} limit - Cantidad de registros por página
   * @returns {Promise<object>} Respuesta de la API
   */
  async function apiGet(q = "", page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const url = q
      ? `${API}/search?q=${encodeURIComponent(q)}&limit=${limit}&skip=${skip}`
      : `${API}?limit=${limit}&skip=${skip}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("GET " + res.status);
    return await res.json();
  }

  /**
   * Renderiza la tabla de departamentos
   * @param {Array} items - Lista de elementos (usuarios simulando departamentos)
   * @returns {string} HTML de la tabla
   */
  function renderTable(items) {
    return `
      <table class="tabla-estilizada">
        <thead>
          <tr>
            <th>ID</th>
            <th>Departamento</th>
            <th>Empleados (simulado)</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(u => `
            <tr data-id="${u.id}">
              <td>${u.id}</td>
              <td>${u.firstName} ${u.lastName}</td>
              <td>${u.age}</td>
              <td>
                <button class="edit-btn">✏️</button>
                <button class="delete-btn">🗑️</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  }

  /**
   * Renderiza el paginador
   * @returns {string} HTML de la paginación
   */
  function renderPagination() {
    const pages = Math.ceil(state.total / state.limit) || 1;
    return `
      <div class="pagination">
        <button id="dep-first" ${state.page <= 1 ? "disabled" : ""}>«</button>
        <button id="dep-prev" ${state.page <= 1 ? "disabled" : ""}>‹</button>
        <span>Página ${state.page} de ${pages} • Total: ${state.total}</span>
        <button id="dep-next" ${state.page >= pages ? "disabled" : ""}>›</button>
        <button id="dep-last" ${state.page >= pages ? "disabled" : ""}>»</button>
      </div>`;
  }

  /**
   * Renderiza todo el módulo (tabla, buscador, paginación)
   */
  async function draw() {
    // Mensaje de carga
    state.container.innerHTML = `<p>Cargando departamentos...</p>`;

    // Llamada a la API
    let json;
    try { json = await apiGet(state.search, state.page, state.limit); }
    catch { 
      state.container.innerHTML = `<p>Error cargando datos</p>`;
      return;
    }

    // Guardar resultados
    state.rows = json.users;
    state.total = json.total;

    // HTML principal
    state.container.innerHTML = `
      <h2>Departamentos</h2>
      <div class="top-bar">
        <input type="text" id="dep-search" placeholder="Buscar por nombre..." value="${state.search}">
        <button id="dep-refresh" class="btn-primario">Refrescar</button>
      </div>
      ${renderTable(state.rows)}
      ${renderPagination()}
    `;

    // Eventos del buscador
    const inp = state.container.querySelector("#dep-search");
    inp.onkeypress = e => { 
      if (e.key==="Enter") { 
        state.search=inp.value.trim(); 
        state.page = 1; 
        draw(); 
      } 
    };

    // Botón refrescar
    state.container.querySelector("#dep-refresh").onclick = () => {
      state.search = inp.value.trim(); 
      state.page = 1; 
      draw();
    };

    // Eventos de paginación
    state.container.querySelector("#dep-first").onclick = () => { state.page=1; draw(); };
    state.container.querySelector("#dep-prev").onclick = () => { if (state.page>1) state.page--, draw(); };
    state.container.querySelector("#dep-next").onclick = () => {
      if (state.page * state.limit < state.total) state.page++, draw();
    };
    state.container.querySelector("#dep-last").onclick = () => {
      state.page = Math.ceil(state.total/state.limit); 
      draw();
    };

    // Eventos de edición y eliminación (simulados)
    state.container.querySelectorAll(".edit-btn").forEach(btn => {
      btn.onclick = () => alert(`Función editar aún no implementada (ID ${btn.closest("tr").dataset.id})`);
    });
    state.container.querySelectorAll(".delete-btn").forEach(btn => {
      btn.onclick = () => alert(`Función eliminar aún no implementada (ID ${btn.closest("tr").dataset.id})`);
    });
  }

  /**
   * Función pública para renderizar el módulo en un contenedor dado
   * @param {HTMLElement} container - Contenedor destino
   * @param {object} opts - Opciones de configuración (limit)
   */
  window.DepartamentoRender = async function(container, opts = {}) {
    state.container = container;
    state.limit = opts.limit || 10;
    state.page = 1;
    state.search = "";
    await draw();
  };
})();
