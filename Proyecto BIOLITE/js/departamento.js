// js/departamento.js
(function() {
  const API = "https://dummyjson.com/users";
  const state = { container: null, rows: [], page: 1, limit: 10, total: 0, search: "" };

  async function apiGet(q = "", page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const url = q
      ? `${API}/search?q=${encodeURIComponent(q)}&limit=${limit}&skip=${skip}`
      : `${API}?limit=${limit}&skip=${skip}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("GET " + res.status);
    return await res.json();
  }

  function renderTable(items) {
    return `
      <table class="tabla-estilizada">
        <thead><tr><th>ID</th><th>Departamento</th><th>Empleados (simulado)</th><th>Acciones</th></tr></thead>
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

  async function draw() {
    state.container.innerHTML = `<p>Cargando departamentos...</p>`;
    let json;
    try { json = await apiGet(state.search, state.page, state.limit); }
    catch { state.container.innerHTML = `<p>Error cargando datos</p>`; return; }
    state.rows = json.users; state.total = json.total;

    state.container.innerHTML = `
      <h2>Departamentos</h2>
      <div class="top-bar">
        <input type="text" id="dep-search" placeholder="Buscar por nombre..." value="${state.search}">
        <button id="dep-refresh" class="btn-primario">Refrescar</button>
      </div>
      ${renderTable(state.rows)}
      ${renderPagination()}
    `;

    const inp = state.container.querySelector("#dep-search");
    inp.onkeypress = e => { if (e.key==="Enter") { state.search=inp.value.trim(); state.page = 1; draw(); } };

    state.container.querySelector("#dep-refresh").onclick = () => {
      state.search = inp.value.trim(); state.page = 1; draw();
    };

    state.container.querySelector("#dep-first").onclick = () => { state.page=1; draw(); };
    state.container.querySelector("#dep-prev").onclick = () => { if (state.page>1) state.page--, draw(); };
    state.container.querySelector("#dep-next").onclick = () => {
      if (state.page * state.limit < state.total) state.page++, draw();
    };
    state.container.querySelector("#dep-last").onclick = () => {
      state.page = Math.ceil(state.total/state.limit); draw();
    };

    state.container.querySelectorAll(".edit-btn").forEach(btn => {
      btn.onclick = () => alert(`Función editar aún no implementada (ID ${btn.closest("tr").dataset.id})`);
    });
    state.container.querySelectorAll(".delete-btn").forEach(btn => {
      btn.onclick = () => alert(`Función eliminar aún no implementada (ID ${btn.closest("tr").dataset.id})`);
    });
  }

  window.DepartamentoRender = async function(container, opts = {}) {
    state.container = container;
    state.limit = opts.limit || 10;
    state.page = 1;
    state.search = "";
    await draw();
  };
})();
