// asistencia.js
// Vista "Reporte de Marcaciones" separada con API de ejemplo + paginación client-side.
// Expone: window.Asistencia.render(container, { limit? })

(function () {
  const API = "https://randomuser.me/api/?results=40&nat=es,us,br,mx,co,pe,cl,ar";

  // ---- Estado local de la vista ----
  const state = {
    container: null,
    rows: [],
    page: 1,
    limit: 10, // puedes cambiarlo vía Asistencia.render(..., {limit})
  };

  // ---- Utilidades ----
  const pad2 = (n) => String(n).padStart(2, "0");
  const minutesToHHMM = (mins) => {
    const m = Math.max(0, Math.floor(mins));
    return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
  };

  function simulateAttendance() {
    const present = Math.random() < 0.9; // 90% presente
    const tardyMin = present ? Math.floor(Math.random() * 25) : 0;
    const earlyMin = present && Math.random() < 0.25 ? Math.floor(Math.random() * 60) : 0;
    const lunchExt = present && Math.random() < 0.15;
    const overtime = present && Math.random() < 0.1 ? Math.floor(Math.random() * 90) : 0;
    return { present, tardyMin, earlyMin, lunchExt, overtime };
  }

  function buildKPIs(rows) {
    const k = { asistencia: 0, ausencias: 0, tardanzas: 0, almuerzoExt: 0, retirosTemprano: 0, sobretiempo: 0 };
    rows.forEach(r => {
      if (r.present) k.asistencia++; else k.ausencias++;
      if (r.tardyMin > 0) k.tardanzas++;
      if (r.lunchExt) k.almuerzoExt++;
      if (r.earlyMin > 0) k.retirosTemprano++;
      if (r.overtime > 0) k.sobretiempo++;
    });
    return k;
  }

  function showLoading(el) {
    el.innerHTML = `<h2>Cargando...</h2><p>Consultando la base de datos.</p>`;
  }
  function showError(el, err) {
    el.innerHTML = `<h2>Error cargando "Reporte de Marcaciones".</h2>${err ? `<p>${err.message || err}</p>` : ""}`;
  }

async function fetchRows() {

  const res = await fetch(API);
  const data = await res.json();
  const users = Array.isArray(data.results) ? data.results : [];

  return users.map((u, idx) => {
    const sim = simulateAttendance();
    const nombre = `${u.name.first} ${u.name.last}`.replace(/\b\w/g, c => c.toUpperCase());
    const id = (u.id?.value || u.login?.uuid || idx + 1).toString().replace(/\W/g, "").slice(0, 6);

    // ✅ Ahora sí podemos buscar por nombre
    const turno = window.Turnos.getTurnoPorEmpleado(nombre);

    const entrada = turno?.inicio || "--:--";
    const salida = turno?.fin || "--:--";
    const horario = `${entrada} | ${salida}`;

    function hhmmToMinutes(hhmm) {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    }

    const entradaMin = turno?.inicio ? hhmmToMinutes(turno.inicio) : 480;
    const llegadaMinSim = entradaMin + sim.tardyMin;

    const estado = sim.present
      ? (sim.tardyMin > 0 ? "Tarde" : "Ok")
      : "Ausente";

    return {
      id,
      nombre,
      nivel: ["Proyecto Abc", "Sucursal 1", "Sucursal 2"][Math.floor(Math.random() * 3)],
      lugar: ["Oficina Central", "Planta Norte", "Sucursal Centro"][Math.floor(Math.random() * 3)],
      horario,
      marcaciones: sim.present ? (2 + Math.floor(Math.random() * 2)) : 0,
      horas: sim.present ? minutesToHHMM(8 * 60 - sim.tardyMin - sim.earlyMin - (sim.lunchExt ? 20 : 0) + sim.overtime) : "--:--",
      cargo: sim.present ? minutesToHHMM(9 * 60 - (60 + sim.tardyMin)) : "--:--",
      estado,
      retiro: sim.present ? minutesToHHMM(sim.earlyMin) : "--:--",
      present: sim.present,
      tardyMin: sim.tardyMin,
      lunchExt: sim.lunchExt,
      earlyMin: sim.earlyMin,
      overtime: sim.overtime,
    };
  });
}


  // ---- Render principal (estructura fija: KPIs + filtros + tabla + paginación) ----
  function renderShell(container, kpisHtml, tableHtml, paginationHtml) {
    container.innerHTML = `
      <div class="page-title"><i class='bx bx-grid-alt'></i> <span>Vista de asistencia</span></div>

      <div class="kpis">
        ${kpisHtml}
      </div>

      <div class="filter-bar">
        <div class="filter"><i class='bx bx-buildings'></i><select><option>Oficina Central</option></select></div>
        <div class="filter"><i class='bx bx-git-branch'></i><select><option>Nivel organizacional</option></select></div>
        <div class="filter"><i class='bx bx-user'></i><select><option>Trabajadores</option></select></div>
        <div class="filter"><i class='bx bx-id-card'></i><select><option>Tipo de trabajador</option></select></div>
        <div class="filter"><i class='bx bx-briefcase'></i><select><option>Cargo</option></select></div>
        <div class="filter"><i class='bx bx-check-circle'></i><select><option>Estado</option></select></div>
        <div class="actions-right">
          <button class="btn"><i class='bx bx-upload'></i> Importar marcaciones</button>
          <button class="btn" title="Exportar"><i class='bx bx-download'></i></button>
          <button class="btn" title="Actualizar" id="btn-refresh"><i class='bx bx-refresh'></i></button>
        </div>
      </div>

      <div class="table-card">
        ${tableHtml}
      </div>

      ${paginationHtml}
    `;
  }

  function kpisHTML(rows) {
    const k = buildKPIs(rows);
    return `
      <div class="kpi green"><div class="big">${k.asistencia}</div><div class="label">Asistencia</div></div>
      <div class="kpi red"><div class="big">${k.ausencias}</div><div class="label">Ausencias</div></div>
      <div class="kpi red"><div class="big">${k.tardanzas}</div><div class="label">Tardanzas</div></div>
      <div class="kpi red"><div class="big">${k.almuerzoExt}</div><div class="label">Almuerzo extendido</div></div>
      <div class="kpi red"><div class="big">${k.retirosTemprano}</div><div class="label">Retiros temprano</div></div>
      <div class="kpi teal"><div class="big">${k.sobretiempo}</div><div class="label">Sobretimepo</div></div>
    `;
  }

  function tableHTML(pageRows) {
    return `
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Nivel organizacional</th><th>Lugar</th>
            <th>Horario</th><th>Marc.</th><th>Horas</th><th>Cargo</th><th>Estado</th><th>Retiro</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${pageRows.map(r => `
            <tr>
              <td>${r.id}</td>
              <td>${r.nombre}</td>
              <td>${r.nivel}</td>
              <td>${r.lugar}</td>
              <td><span class="chip blue">${r.horario}</span></td>
              <td><span class="chip gray">${r.marcaciones}</span></td>
              <td><span class="chip gray">${r.horas}</span></td>
              <td><span class="chip gray">${r.cargo}</span></td>
              <td><span class="chip ${r.present ? (r.tardyMin>0 ? "red" : "gray") : "red"}">${r.estado}</span></td>
              <td><span class="chip ${r.earlyMin>0 ? "red" : "gray"}">${r.retiro}</span></td>
              <td><button class="btn-pill">Ver</button></td>
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
    `;
  }

  // ---- Control de página ----
  function slicePage(rows, page, limit) {
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  }

  function attachPaginationHandlers() {
    const total = state.rows.length;
    const totalPages = Math.max(1, Math.ceil(total / state.limit));
    const go = (p) => {
      state.page = Math.min(Math.max(1, p), totalPages);
      draw(); // re-render solo tabla + paginación (estructura completa para simpleza)
    };
    document.getElementById("pag-first")?.addEventListener("click", () => go(1));
    document.getElementById("pag-prev") ?.addEventListener("click", () => go(state.page - 1));
    document.getElementById("pag-next") ?.addEventListener("click", () => go(state.page + 1));
    document.getElementById("pag-last") ?.addEventListener("click", () => go(totalPages));
  }

  // ---- Render global de la vista ----
  function draw() {
    const rows = state.rows;
    const pageRows = slicePage(rows, state.page, state.limit);

    const kpis = kpisHTML(rows);
    const table = tableHTML(pageRows);
    const pag  = paginationHTML(rows.length, state.page, state.limit);

    renderShell(state.container, kpis, table, pag);

    // botones de la barra (refresh)
    state.container.querySelector("#btn-refresh")?.addEventListener("click", () => render(state.container, { limit: state.limit }));

    // paginación
    attachPaginationHandlers();
  }

  // ---- API pública del módulo ----
  async function render(container, opts = {}) {
    state.container = container;
    if (typeof opts.limit === "number" && opts.limit > 0) state.limit = opts.limit;
    state.page = 1;

    try {
      showLoading(container);
      state.rows = await fetchRows();
      draw();
    } catch (err) {
      showError(container, err);
    }
  }

  window.Asistencia = { render };
})();
