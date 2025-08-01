(function () {
  const LSK = "turnos_data_v1";

  // Horarios fijos para cada turno
  const TURNOS_FIJOS = {
    Diurno: { inicio: "08:00", fin: "16:00" },
    Tarde: { inicio: "16:00", fin: "00:00" },
    Nocturno: { inicio: "00:00", fin: "08:00" },
  };

  const state = {
    container: null,
    rows: [],
    page: 1,
    limit: 10,
  };

  /* ---------- Storage ---------- */
  const loadLS = () => {
    try { return JSON.parse(localStorage.getItem(LSK) || "[]"); }
    catch { return []; }
  };
  const saveLS = (rows) => {
    try { localStorage.setItem(LSK, JSON.stringify(rows)); }
    catch {}
  };

  function ensureTurnos() {
    if (!localStorage.getItem(LSK)) {
      localStorage.setItem(LSK, JSON.stringify([]));
    }
  }

  /* ---------- Helpers ---------- */
  function fmtTime(t) {
    if (!t) return "";
    const [h, m] = t.split(":");
    return `${h.padStart(2,"0")}:${m.padStart(2,"0")}`;
  }

  function genId() {
    return String(Math.floor(100000 + Math.random() * 899999));
  }

  /* ---------- Render HTML ---------- */
  function renderShell(container, tableHtml, paginationHtml) {
    container.innerHTML = `
      <div class="page-title"><i class='bx bx-time'></i> <span>Asignación de Turnos</span></div>
      <div class="actions-bar">
        <button class="btn primary" id="btn-add">Asignar nuevo turno</button>
      </div>
      <div class="table-card">${tableHtml}</div>
      ${paginationHtml}
    `;
  }

  function tableHTML(pageRows) {
    return `
      <table>
        <thead>
          <tr>
            <th>ID Turno</th>
            <th>Empleado</th>
            <th>Turno</th>
            <th>Horario</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows.map(r => `
            <tr data-id="${r.idTurno}">
              <td>${r.idTurno}</td>
              <td>${r.empleadoNombre}</td>
              <td>${r.turno}</td>
              <td>${fmtTime(r.inicio)} - ${fmtTime(r.fin)}</td>
              <td class="actions">
                <button class="btn-icon edit" title="Editar"><i class='bx bx-edit'></i></button>
                <button class="btn-icon delete" title="Eliminar"><i class='bx bx-trash'></i></button>
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
        <span class="pagination-info">Página ${Math.min(page, totalPages)} de ${totalPages} • ${total} turnos</span>
        <button id="pag-next" ${page >= totalPages ? "disabled" : ""}>›</button>
        <button id="pag-last" ${page >= totalPages ? "disabled" : ""}>»</button>
      </div>
    `;
  }

  function slicePage(rows, page, limit) {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }

  /* ---------- Modal ---------- */
  function openModal(editData) {
    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";

      // Obtener empleados de window.Empleados.rows (o ajusta el path según tu empleados.js)
      const empleados = (window.Empleados && window.Empleados.rows) || [];
      const opcionesEmpleados = empleados.length > 0
        ? empleados.map(e => `<option value="${e.employee_name}">${e.employee_name}</option>`).join("")
        : `<option value="">No hay empleados disponibles</option>`;

      // Valor seleccionado si es edición
      const selectedTurno = editData?.turno || "";
      const selectedEmpleado = editData?.empleadoNombre || "";

      overlay.innerHTML = `
        <div class="modal-box">
          <header>
            <span>${editData ? "Editar turno" : "Asignar nuevo turno"}</span>
            <button class="icon-btn" id="m-close"><i class='bx bx-x'></i></button>
          </header>
          <div class="body">
            <div class="field">
              <label>Empleado</label>
              <select id="m-empleadoNombre" autofocus>
                <option value="">-- Selecciona un empleado --</option>
                ${opcionesEmpleados}
              </select>
            </div>
            <div class="field">
              <label>Turno</label>
              <select id="m-turno">
                <option value="">-- Selecciona un turno --</option>
                <option value="Diurno" ${selectedTurno === "Diurno" ? "selected" : ""}>Diurno</option>
                <option value="Tarde" ${selectedTurno === "Tarde" ? "selected" : ""}>Tarde</option>
                <option value="Nocturno" ${selectedTurno === "Nocturno" ? "selected" : ""}>Nocturno</option>
              </select>
            </div>
          </div>
          <div class="actions">
            <button class="btn ghost" id="m-cancel">Cancelar</button>
            <button class="btn primary" id="m-save">Guardar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      // Preseleccionar empleado y turno si es edición
      if (selectedEmpleado) {
        overlay.querySelector("#m-empleadoNombre").value = selectedEmpleado;
      }

      const close = () => overlay.remove();

      overlay.querySelector("#m-close").onclick = close;
      overlay.querySelector("#m-cancel").onclick = () => { close(); resolve(null); };

      overlay.querySelector("#m-save").onclick = () => {
        const empleadoNombre = overlay.querySelector("#m-empleadoNombre").value;
        const turno = overlay.querySelector("#m-turno").value;

        if (!empleadoNombre) {
          alert("Por favor selecciona un empleado");
          return;
        }
        if (!turno) {
          alert("Por favor selecciona un turno");
          return;
        }

        // Extraer horas fijas según turno
        const horario = TURNOS_FIJOS[turno];
        if (!horario) {
          alert("Turno no válido");
          return;
        }

        close();
        resolve({
          empleadoNombre,
          turno,
          inicio: horario.inicio,
          fin: horario.fin,
        });
      };
    });
  }

  /* ---------- Render ---------- */
  function draw() {
    const all = state.rows;
    const pageRows = slicePage(all, state.page, state.limit);

    renderShell(state.container, tableHTML(pageRows), paginationHTML(all.length, state.page, state.limit));

    const totalPages = Math.max(1, Math.ceil(all.length / state.limit));
    const go = (p) => {
      state.page = Math.min(Math.max(1, p), totalPages);
      draw();
    };

    state.container.querySelector("#pag-first").onclick = () => go(1);
    state.container.querySelector("#pag-prev").onclick = () => go(state.page - 1);
    state.container.querySelector("#pag-next").onclick = () => go(state.page + 1);
    state.container.querySelector("#pag-last").onclick = () => go(totalPages);

    state.container.querySelector("#btn-add").onclick = async () => {
      const data = await openModal(null);
      if (data) {
        // Verificar que el empleado no tenga turno ya asignado (opcional)
        const yaAsignado = state.rows.find(r => r.empleadoNombre === data.empleadoNombre);
        if (yaAsignado) {
          if (!confirm(`El empleado ${data.empleadoNombre} ya tiene un turno asignado. ¿Quieres reemplazarlo?`)) return;
          // Remover turno anterior
          state.rows = state.rows.filter(r => r.empleadoNombre !== data.empleadoNombre);
        }

        const nuevo = {
          idTurno: genId(),
          empleadoNombre: data.empleadoNombre,
          turno: data.turno,
          inicio: data.inicio,
          fin: data.fin,
        };
        state.rows.unshift(nuevo);
        saveLS(state.rows);
        state.page = 1;
        draw();
      }
    };

    state.container.querySelectorAll(".btn-icon.edit").forEach(btn => {
      btn.onclick = async (e) => {
        const id = e.currentTarget.closest("tr").dataset.id;
        const turno = state.rows.find(t => t.idTurno === id);
        if (!turno) return;

        const data = await openModal(turno);
        if (data) {
          turno.empleadoNombre = data.empleadoNombre;
          turno.turno = data.turno;
          turno.inicio = data.inicio;
          turno.fin = data.fin;
          saveLS(state.rows);
          draw();
        }
      };
    });

    state.container.querySelectorAll(".btn-icon.delete").forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.closest("tr").dataset.id;
        const idx = state.rows.findIndex(t => t.idTurno === id);
        if (idx === -1) return;
        if (confirm("¿Eliminar este turno?")) {
          state.rows.splice(idx, 1);
          saveLS(state.rows);
          draw();
        }
      };
    });
  }

  async function render(container, opts = {}) {
    state.container = container;
    state.limit = typeof opts.limit === "number" && opts.limit > 0 ? opts.limit : state.limit;
    state.page = 1;

    ensureTurnos();
    state.rows = loadLS();
    draw();
  }

  window.Turnos = {
    ensureTurnos,
    getTurnoPorEmpleado: (nombre) => {
      const all = loadLS();
      return all.find(t => t.empleadoNombre?.toLowerCase() === nombre?.toLowerCase()) || null;
    },
    render,
  };
})();
