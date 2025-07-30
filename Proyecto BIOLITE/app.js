/* ===== Refs ===== */
const sidebar = document.getElementById("sidebar");
const floatingToggle = document.getElementById("floatingToggle");
const submenuLinks = document.querySelectorAll(".submenu a");
const mainSection = document.querySelector(".main-section");
const btnHome = document.getElementById("btn-home");

/* ===== Endpoints (los originales) ===== */
const ENDPOINTS = {
  // Personal
  // Departamento:
  // Cargo:
  // Área:
  Empleado: "https://dummy.restapiexample.com/api/v1/employees",
  Renuncia: "https://jsonplaceholder.typicode.com/posts",

  // Dispositivos
  // Dispositivo:
  // "Comando de Dispositivo":

  // Asistencia
  // "Reporte de Marcaciones": (se maneja en asistencia.js)

  // Sistema
  Usuarios: "https://jsonplaceholder.typicode.com/users",
  // Configuración se mantiene mock
};

/* ===== Traducciones de encabezados ===== */
const traducciones = {
  Usuarios: { id: "ID", name: "Nombre", username: "Usuario", email: "Correo" },
  Empleado: { id: "ID", employee_name: "Nombre", employee_salary: "Salario", employee_age: "Edad" },
  Renuncia: { id: "ID", title: "Título", body: "Contenido" },
  Configuración: { key: "Clave", value: "Valor" },
  Departamento: { id: "ID", nombre: "Nombre", jefe: "Jefe" },
  Cargo: { id: "ID", nombre: "Nombre", salario: "Salario" },
  Área: { id: "ID", nombre: "Nombre" },
  Dispositivo: { id: "ID", nombre: "Nombre", tipo: "Tipo" },
  "Comando de Dispositivo": { id: "ID", comando: "Comando", dispositivoId: "ID Dispositivo" },
  "Reporte de Marcaciones": { id: "ID", empleado: "Empleado", fecha: "Fecha", hora: "Hora", tipo: "Tipo" },
};

/* ===== Paginación simple (config por vista) =====
   - 'server': usa parámetros en URL y lee total por header si existe.
   - 'client': trae todo y pagina en memoria.
*/
const PAGINATION = {
  Renuncia: { mode: "server", pageParam: "_page", limitParam: "_limit", totalHeader: "x-total-count" },
  Usuarios: { mode: "client" },
  Empleado: { mode: "client" },
};

/* ===== Cargadores perezosos ===== */
let _paginacionReady = false;
function ensurePaginacion() {
  return new Promise((resolve, reject) => {
    if (window.Paginacion) {
      if (!_paginacionReady) {
        window.Paginacion.init({
          ENDPOINTS,
          PAGINATION,
          showLoading,
          showError,
          renderTable: renderizarTabla,
        });
        _paginacionReady = true;
      }
      return resolve();
    }
    const s = document.createElement("script");
    s.src = "paginacion.js"; // mismo directorio
    s.async = true;
    s.onload = () => {
      window.Paginacion.init({
        ENDPOINTS,
        PAGINATION,
        showLoading,
        showError,
        renderTable: renderizarTabla,
      });
      _paginacionReady = true;
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ---- NUEVO: cargador perezoso de Asistencia ----
let _asistenciaReady = false;
function ensureAsistencia() {
  return new Promise((resolve, reject) => {
    if (window.Asistencia) return resolve();
    const s = document.createElement("script");
    s.src = "asistencia.js";
    s.async = true;
    s.onload = () => { _asistenciaReady = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ---- NUEVO: cargador perezoso de Solicitudes ----
function ensureSolicitudes() {
  return new Promise((resolve, reject) => {
    if (window.Solicitudes) return resolve();
    const s = document.createElement("script");
    s.src = "solicitudes.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}


/* ===== Sidebar / Submenús ===== */
floatingToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  if (sidebar.classList.contains("collapsed")) {
    document.querySelectorAll(".menu-group.open").forEach(m => m.classList.remove("open"));
  }
});
document.querySelectorAll(".menu-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    if (sidebar.classList.contains("collapsed")) return;
    const parent = btn.closest(".menu-group");
    const isOpen = parent.classList.contains("open");
    document.querySelectorAll(".menu-group.open").forEach(m => m.classList.remove("open"));
    if (!isOpen) parent.classList.add("open");
  });
});

/* ===== UI helpers ===== */
const showLoading = () => {
  mainSection.innerHTML = `<h2>Cargando...</h2><p>Consultando la base de datos.</p>`;
};
const showNotLinked = (nombreTabla) => {
  mainSection.innerHTML = `
    <h2>La tabla "${nombreTabla}" no está vinculada con base de datos.</h2>
    <p>Agrega su endpoint en <code>ENDPOINTS["${nombreTabla}"]</code>.</p>
  `;
};
const showError = (nombreTabla, err) => {
  mainSection.innerHTML = `<h2>Error cargando datos de "${nombreTabla ?? ""}".</h2>${err ? `<p>${err.message || err}</p>` : ""}`;
};

/* ===== Render de tabla (se mantiene simple) ===== */
function renderizarTabla(nombreTabla, items, total, page, limit) {
  if (!items || items.length === 0) {
    mainSection.innerHTML = `<h2>No hay datos para "${nombreTabla}"</h2>`;
    return;
  }

  const columnas = items.length ? Object.keys(items[0]) : [];
  let html = `<h2>${nombreTabla}</h2><table><thead><tr>`;
  columnas.forEach(col => {
    const header = traducciones[nombreTabla]?.[col] || col.charAt(0).toUpperCase() + col.slice(1);
    html += `<th>${header}</th>`;
  });
  html += `</tr></thead><tbody>`;
  items.forEach(fila => {
    html += `<tr>`;
    columnas.forEach(col => html += `<td>${fila[col] ?? ""}</td>`);
    html += `</tr>`;
  });
  html += `</tbody></table>`;

  // Paginación simple
  const totalPages = Math.max(1, Math.ceil(total / limit));
  html += `
    <div class="pagination">
      <button id="pag-first" ${page <= 1 ? "disabled" : ""}>«</button>
      <button id="pag-prev" ${page <= 1 ? "disabled" : ""}>‹</button>
      <span class="pagination-info">Página ${Math.min(page, totalPages)} de ${totalPages} • ${total} registros</span>
      <button id="pag-next" ${page >= totalPages ? "disabled" : ""}>›</button>
      <button id="pag-last" ${page >= totalPages ? "disabled" : ""}>»</button>
    </div>
  `;

  mainSection.innerHTML = html;

  // Listeners de paginación (llaman al módulo)
  const go = (p) => {
    const st = window.Paginacion.getState();
    window.Paginacion.loadView(st.view, { page: p, limit: st.limit });
  };
  document.getElementById("pag-first")?.addEventListener("click", () => go(1));
  document.getElementById("pag-prev")?.addEventListener("click", () => go(Math.max(1, page - 1)));
  document.getElementById("pag-next")?.addEventListener("click", () => go(Math.min(totalPages, page + 1)));
  document.getElementById("pag-last")?.addEventListener("click", () => go(totalPages));
}

/* ===== Navegación de submenús ===== */
submenuLinks.forEach(link => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();
    const nombreTabla = link.dataset.view || link.textContent.trim();

    // --- Asistencia (Reporte de Marcaciones) delegado a asistencia.js ---
    if (nombreTabla === "Reporte de Marcaciones") {
      try {
        await ensureAsistencia();
        return window.Asistencia.render(mainSection);
      } catch (err) {
        return showError("Reporte de Marcaciones", err);
      }
    }

    if (nombreTabla === "Configuración") {
      // Caso mock sin paginación
      return renderizarTabla("Configuración", [
        { key: "Tema", value: "Oscuro" },
        { key: "Idioma", value: "Español" },
      ], 2, 1, 10);
    }

    if (nombreTabla === "Solicitudes") {
      try {
        await ensureSolicitudes();
        return window.Solicitudes.render(mainSection, { limit: 10 }); // puedes cambiar el page size
      } catch (err) {
        return showError("Solicitudes", err);
      }
    }


    if (!ENDPOINTS[nombreTabla]) return showNotLinked(nombreTabla);

    // Usar la paginación separada
    await ensurePaginacion();
    window.Paginacion.loadView(nombreTabla, { page: 1, limit: 10 });
  });
});

/* ===== Home (gráficas) ===== */
btnHome.addEventListener("click", () => {
  if (!sidebar.classList.contains("collapsed")) sidebar.classList.add("collapsed");
  renderVistaPrincipal();
});
function renderVistaPrincipal() {
  mainSection.innerHTML = `
    <h1 style="text-align:center; margin-bottom: 1rem;">Bienvenido al Sistema de Ponche</h1>
    <div style="display:flex; justify-content:center; gap: 2rem; flex-wrap: wrap;">
      <canvas id="graficaBarras" width="400" height="250" style="background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);"></canvas>
      <canvas id="graficaPastel" width="400" height="250" style="background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);"></canvas>
    </div>
  `;
  dibujarGraficaBarras();
  dibujarGraficaPastel();
}
function dibujarGraficaBarras() {
  const ctx = document.getElementById("graficaBarras").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Recursos Humanos", "Tecnología", "Producción", "Administración"],
      datasets: [{ label: "Número de empleados", data: [10, 15, 7, 5],
        backgroundColor: [
          "rgba(30, 136, 229, 0.7)",
          "rgba(67, 160, 71, 0.7)",
          "rgba(255, 193, 7, 0.7)",
          "rgba(244, 67, 54, 0.7)"] }]
    },
    options: { responsive: false, scales: { y: { beginAtZero: true } } }
  });
}
function dibujarGraficaPastel() {
  const ctx = document.getElementById("graficaPastel").getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Recursos Humanos", "Tecnología", "Producción", "Administración"],
      datasets: [{ label: "Distribución de empleados", data: [10, 15, 7, 5],
        backgroundColor: [
          "rgba(30, 136, 229, 0.7)",
          "rgba(67, 160, 71, 0.7)",
          "rgba(255, 193, 7, 0.7)",
          "rgba(244, 67, 54, 0.7)"] }]
    },
    options: { responsive: false }
  });
}

/* ===== Cargar Home al inicio ===== */
renderVistaPrincipal();
