// cargo.js
(() => {
  // Clave para almacenar datos en LocalStorage
  const STORAGE_KEY = "mis_cargos_localstorage";
  let cargos = [];

  // Referencias a elementos del DOM (se asignan en render)
  let container;
  let modal;
  let modalTitle;
  let form;
  let inputNombre;
  let inputDescripcion;
  let btnGuardar;
  let btnCerrar;
  let idEditando = null; // Guarda el ID del cargo que se está editando

  /**
   * Cargar datos desde LocalStorage
   */
  function cargarLocal() {
    const datos = localStorage.getItem(STORAGE_KEY);
    cargos = datos ? JSON.parse(datos) : [];
  }

  /**
   * Guardar datos en LocalStorage
   */
  function guardarLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cargos));
  }

  /**
   * Cargar datos desde una API externa (simulada)
   * @returns {Promise<Array>} Lista de cargos
   */
  async function cargarDesdeAPI() {
    try {
      const res = await fetch("https://api.example.com/cargos");
      if (!res.ok) throw new Error("Error cargando datos API");
      const data = await res.json();
      // Esperamos un array con objetos {id, nombre, descripcion}
      return data;
    } catch (error) {
      console.error("Error al cargar desde API:", error);
      return [];
    }
  }

  /**
   * Abrir el modal para agregar o editar un cargo
   * @param {boolean} editar - Indica si es edición o creación
   * @param {Object|null} cargo - Datos del cargo a editar
   */
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

  /**
   * Cerrar modal y reiniciar formulario
   */
  function cerrarModal() {
    modal.style.display = "none";
    form.reset();
    idEditando = null;
  }

  /**
   * Validar formulario antes de guardar
   * @returns {boolean} - true si es válido, false si no
   */
  function validarFormulario() {
    if (!inputNombre.value.trim()) {
      alert("El nombre es obligatorio");
      inputNombre.focus();
      return false;
    }
    // Aquí podrían agregarse más validaciones
    return true;
  }

  /**
   * Guardar cargo (nuevo o editado) en la lista y en LocalStorage
   */
  function guardarCargo(e) {
    e.preventDefault();
    if (!validarFormulario()) return;

    const nombre = inputNombre.value.trim();
    const descripcion = inputDescripcion.value.trim();

    if (idEditando) {
      // Editar cargo existente
      const idx = cargos.findIndex(c => c.id === idEditando);
      if (idx !== -1) {
        cargos[idx].nombre = nombre;
        cargos[idx].descripcion = descripcion;
      }
    } else {
      // Crear un nuevo cargo con ID único
      const nuevoId = Date.now().toString();
      cargos.push({ id: nuevoId, nombre, descripcion });
    }
    guardarLocal();
    cerrarModal();
    render(container);
  }

  /**
   * Eliminar cargo por ID
   * @param {string} id - ID del cargo a eliminar
   */
  function eliminarCargo(id) {
    if (!confirm("¿Seguro que deseas eliminar este cargo?")) return;
    cargos = cargos.filter(c => c.id !== id);
    guardarLocal();
    render(container);
  }

  /**
   * Renderizar la interfaz de gestión de cargos
   * @param {HTMLElement} contenedor - Elemento donde se mostrará la tabla
   * @param {Object} opts - Opciones adicionales (opcional)
   */
  async function render(contenedor, opts = {}) {
    container = contenedor;

    cargarLocal();

    // Cargar datos desde API y combinarlos con los locales
    const apiCargos = await cargarDesdeAPI();
    const idsLocales = new Set(cargos.map(c => c.id));
    apiCargos.forEach(c => {
      if (!idsLocales.has(c.id)) cargos.push(c);
    });

    // Guardar la combinación final en LocalStorage
    guardarLocal();

    // HTML de la tabla y el modal
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

      <!-- Modal para agregar/editar cargos -->
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

    // Asignación de referencias de modal y formulario
    modal = document.getElementById("modalCargo");
    modalTitle = document.getElementById("modalTitulo");
    form = document.getElementById("formCargo");
    inputNombre = document.getElementById("nombreCargo");
    inputDescripcion = document.getElementById("descripcionCargo");
    btnGuardar = form.querySelector('button[type="submit"]');
    btnCerrar = document.getElementById("cerrarModal");

    // Eventos
    document.getElementById("btnAgregar").addEventListener("click", () => abrirModal(false));

    // Botones de edición
    container.querySelectorAll(".btn-accion.editar").forEach(btn => {
      btn.addEventListener("click", e => {
        const id = e.currentTarget.dataset.id;
        const cargo = cargos.find(c => c.id === id);
        if (cargo) abrirModal(true, cargo);
      });
    });

    // Botones de eliminación
    container.querySelectorAll(".btn-accion.eliminar").forEach(btn => {
      btn.addEventListener("click", e => {
        const id = e.currentTarget.dataset.id;
        eliminarCargo(id);
      });
    });

    // Cerrar modal
    btnCerrar.addEventListener("click", cerrarModal);
    window.addEventListener("click", e => {
      if (e.target === modal) cerrarModal();
    });

    // Guardar cargo al enviar formulario
    form.addEventListener("submit", guardarCargo);
  }

  // Exponer función de renderizado para que app.js la invoque
  window.CargosRender = render;
})();
