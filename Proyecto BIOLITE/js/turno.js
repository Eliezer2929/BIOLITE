const Turnos = (() => {
  const LSK = "turnos_asignados_v1";

  const state = {
    container: null,
    empleados: [],
    turnosAsignados: [],
    dataLoaded: false,
  };

  const TURNOS = {
    Diurno: "08:00 - 16:00",
    Tarde: "16:00 - 00:00",
    Nocturno: "00:00 - 08:00",
  };

  function cargarTurnosLocales() {
    const data = localStorage.getItem(LSK);
    return data ? JSON.parse(data) : [];
  }

  function guardarTurnosLocales(data) {
    localStorage.setItem(LSK, JSON.stringify(data));
  }

  async function obtenerEmpleados() {
    try {
      if (!window.Empleados || typeof window.Empleados.waitForDataLoaded !== "function") {
        throw new Error("El módulo Empleados no está disponible o no tiene waitForDataLoaded.");
      }

      const empleados = await window.Empleados.waitForDataLoaded();
      return Array.isArray(empleados) ? empleados : [];
    } catch (error) {
      console.error("Error cargando empleados:", error.message);
      return [];
    }
  }

  function crearFilaEmpleado(emp) {
    const tr = document.createElement("tr");

    const tdNombre = document.createElement("td");
    tdNombre.textContent = emp.employee_name || "N/A";

    const tdCedula = document.createElement("td");
    tdCedula.textContent = emp.id || "N/A";

    const tdTurno = document.createElement("td");
    const select = document.createElement("select");

    select.innerHTML = `<option value="">Seleccionar</option>` +
      Object.keys(TURNOS)
        .map(turno => `<option value="${turno}">${turno}</option>`)
        .join("");

    const asignado = state.turnosAsignados.find(t => t.id === emp.id);
    if (asignado) {
      select.value = asignado.turno;
    }

    select.addEventListener("change", () => {
      const existe = state.turnosAsignados.find(t => t.id === emp.id);
      if (existe) {
        existe.turno = select.value;
      } else {
        state.turnosAsignados.push({ id: emp.id, turno: select.value });
      }
      guardarTurnosLocales(state.turnosAsignados);
      renderTabla();
    });

    tdTurno.appendChild(select);

    const tdHorario = document.createElement("td");
    tdHorario.textContent = asignado ? TURNOS[asignado.turno] || "—" : "—";

    tr.appendChild(tdNombre);
    tr.appendChild(tdCedula);
    tr.appendChild(tdTurno);
    tr.appendChild(tdHorario);

    return tr;
  }

  async function renderTabla() {
    const tbody = state.container.querySelector("tbody");
    tbody.innerHTML = "";

    if (!state.empleados.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "no-empleados";
      td.textContent = "No hay empleados disponibles.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    state.empleados.forEach(emp => {
      const tr = crearFilaEmpleado(emp);
      tbody.appendChild(tr);
    });
  }

  async function render(container) {
    state.container = container;
    container.innerHTML = `
      <section class="turnos-section">
        <h2>Asignación de Turnos</h2>
        <div class="tabla-turnos">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cédula</th>
                <th>Turno</th>
                <th>Horario</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </section>
    `;

    state.turnosAsignados = cargarTurnosLocales();
    state.empleados = await obtenerEmpleados();
    state.dataLoaded = true;
    await renderTabla();
  }

  // Para asistencia.js u otros módulos
  async function ensureTurnos() {
    if (!state.dataLoaded) {
      state.turnosAsignados = cargarTurnosLocales();
      state.empleados = await obtenerEmpleados();
      state.dataLoaded = true;
    }
  }

  function getTurnoPorEmpleado(nombre) {
    if (!state.dataLoaded || !Array.isArray(state.empleados)) return null;

    const emp = state.empleados.find(e =>
      (e.employee_name || "").toLowerCase().trim() === nombre.toLowerCase().trim()
    );

    if (!emp) return null;

    const turnoAsignado = state.turnosAsignados.find(t => t.id === emp.id);
    if (!turnoAsignado) return null;

    const horario = TURNOS[turnoAsignado.turno];
    if (!horario) return null;

    const [inicio, fin] = horario.split(" - ");

    return {
      nombre: emp.employee_name,
      turno: turnoAsignado.turno,
      inicio,
      fin,
    };
  }

  return {
    init: render,
    ensureTurnos,
    getTurnoPorEmpleado,
  };
})();

window.Turnos = Turnos;
