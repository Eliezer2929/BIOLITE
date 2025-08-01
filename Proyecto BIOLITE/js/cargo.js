// cargo.js
(() => {
  const STORAGE_KEY = "mis_cargos_localstorage";
  let cargos = [];

  // Referencias a DOM
  let container;
  let modal;
  let modalTitle;
  let form;
  let inputNombre;
  let inputDescripcion;
  let btnGuardar;
  let btnCerrar;
  let idEditando = null;

  // Cargar datos desde localStorage
  function cargarLocal() {
    const datos = localStorage.getItem(STORAGE_KEY);
    cargos = datos ? JSON.parse(datos) : [];
  }

  // Guardar datos en localStorage
  function guardarLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cargos));
  }

  // Cargar datos desde API (modifica URL aquí)
  async function cargarDesdeAPI() {
    try {
      const res = await fetch("https://api.example.com/cargos");
      if (!res.ok) throw new Error("Error cargando datos API");
      const data = await res.json();
      // Esperamos array con {id, nombre, descripcion}
      return data;
    } catch (error) {
      console.error("Error al cargar desde API:", error);
      return [];
    }
  }

  // Abrir modal para agregar o editar
  function abrirModal(editar = false, cargo = null) {
    modal.style.display = "block";
    if (editar) {
      modalTitle.textContent = "Editar Cargo";
      inputNombre.value = cargo.nombre;
      inputDescripcion.value = cargo.descripcion;
      idEditando = cargo.id;
    } else {
      modalTitle.textContent = "Agregar Cargo";
      inputNombre.value = "";
      inputDescripcion.value = "";
      idEditando = null;
    }
  }

  // Cerrar modal
  function cerrarModal() {
    modal.style.display = "none";
    form.reset();
    idEditando = null;
  }

  // Validar formulario simple
  function validarFormulario() {
    if (!inputNombre.value.trim()) {
      alert("El nombre es obligatorio");
      inputNombre.focus();
      return false;
    }
    // Puedes agregar más validaciones aquí si quieres
    return true;
  }

  // Guardar cargo (nuevo o editado)
  function guardarCargo(e) {
    e.preventDefault();
    if (!validarFormulario()) return;

    const nombre = inputNombre.value.trim();
    const descripcion = inputDescripcion.value.trim();

    if (idEditando) {
      // Editar
      const idx = cargos.findIndex(c => c.id === idEditando);
      if (idx !== -1) {
        cargos[idx].nombre = nombre;
        cargos[idx].descripcion = descripcion;
      }
    } else {
      // Nuevo cargo
      // Crear ID único simple (puedes mejorar esto)
      const nuevoId = Date.now().toString();
      cargos.push({ id: nuevoId, nombre, descripcion });
    }
    guardarLocal();
    cerrarModal();
    render(container);
  }

  // Eliminar cargo
  function eliminarCargo(id) {
    if (!confirm("¿Seguro que deseas eliminar este cargo?")) return;
    cargos = cargos.filter(c => c.id !== id);
    guardarLocal();
    render(container);
  }

  // Renderizar tabla y UI
  async function render(contenedor, opts = {}) {
    container = contenedor;

    cargarLocal();

    // Cargar datos API y combinar
    const apiCargos = await cargarDesdeAPI();
    const idsLocales = new Set(cargos.map(c => c.id));
    apiCargos.forEach(c => {
      if (!idsLocales.has(c.id)) cargos.push(c);
    });

    // Guardar combinado para que se mantenga en localStorage
    guardarLocal();

    // HTML tabla
    let html = `
      <div style="margin-bottom:1rem; display:flex; justify-content: space-between; align-items:center;">
        <h2>Cargos</h2>
        <button id="btnAgregar" class="btn-primario">Agregar Cargo</button>
      </div>
      <table class="tabla-estilizada" style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${cargos.length ? cargos.map(cargo => `
            <tr>
              <td>${cargo.id}</td>
              <td>${cargo.nombre}</td>
              <td>${cargo.descripcion}</td>
              <td>
                <button class="btn-accion editar" data-id="${cargo.id}" title="Editar">&#9998;</button>
                <button class="btn-accion eliminar" data-id="${cargo.id}" title="Eliminar">&#10060;</button>
              </td>
            </tr>
          `).join("") : `<tr><td colspan="4" style="text-align:center;">No hay cargos registrados.</td></tr>`}
        </tbody>
      </table>

      <!-- Modal -->
      <div id="modalCargo" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background-color: rgba(0,0,0,0.4); z-index:1000; overflow:auto;">
        <div class="modal-content" style="background:#fff; margin:5% auto; padding:1.5rem; border-radius:8px; max-width:480px; position:relative;">
          <span id="cerrarModal" class="close" style="position:absolute; top:8px; right:14px; font-size:28px; font-weight:bold; cursor:pointer;">&times;</span>
          <h2 id="modalTitulo"></h2>
          <form id="formCargo" class="form-estilizado">
            <label for="nombreCargo">Nombre:</label>
            <input type="text" id="nombreCargo" name="nombre" required />

            <label for="descripcionCargo">Descripción:</label>
            <textarea id="descripcionCargo" name="descripcion" rows="3"></textarea>

            <button type="submit" class="btn-primario" style="margin-top: 10px;">Guardar</button>
          </form>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Referencias modal y formulario
    modal = document.getElementById("modalCargo");
    modalTitle = document.getElementById("modalTitulo");
    form = document.getElementById("formCargo");
    inputNombre = document.getElementById("nombreCargo");
    inputDescripcion = document.getElementById("descripcionCargo");
    btnGuardar = form.querySelector('button[type="submit"]');
    btnCerrar = document.getElementById("cerrarModal");

    // Event listeners
    document.getElementById("btnAgregar").addEventListener("click", () => abrirModal(false));

    // Delegación para botones editar y eliminar
    container.querySelectorAll(".btn-accion.editar").forEach(btn => {
      btn.addEventListener("click", e => {
        const id = e.currentTarget.dataset.id;
        const cargo = cargos.find(c => c.id === id);
        if (cargo) abrirModal(true, cargo);
      });
    });
    container.querySelectorAll(".btn-accion.eliminar").forEach(btn => {
      btn.addEventListener("click", e => {
        const id = e.currentTarget.dataset.id;
        eliminarCargo(id);
      });
    });

    btnCerrar.addEventListener("click", cerrarModal);
    window.addEventListener("click", e => {
      if (e.target === modal) cerrarModal();
    });
    form.addEventListener("submit", guardarCargo);
  }

  // Exponer función de renderizado para que app.js la use
  window.CargosRender = render;
})();
