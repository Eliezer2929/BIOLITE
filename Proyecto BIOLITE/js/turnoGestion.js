// turnoGestion.js

window.TurnoGestion = {
  // Estado global del módulo
  state: {
    turnos: [],  // Array de objetos turno: { id, nombre, dias, entradaNormal, salidaNormal, turnoFinSemana: {nombre, entrada, salida}, aplicarFestivos }
    modal: {     // Estado del modal actual
      visible: false,      // Si el modal está visible o no
      modo: '',            // Modo del modal: 'nuevo' o 'editar'
      turnoEdit: null,     // Turno que se está editando (objeto) o null para nuevo
      modalFSVisible: false, // Si está visible el modal específico de fines de semana
    },
  },

  /**
   * Carga la lista de turnos desde localStorage.
   * Si no hay datos, inicializa con arreglo vacío.
   */
  loadTurnos() {
    const data = localStorage.getItem('turnosGestion');
    this.state.turnos = data ? JSON.parse(data) : [];
  },

  /**
   * Guarda la lista actual de turnos en localStorage en formato JSON.
   */
  saveTurnos() {
    localStorage.setItem('turnosGestion', JSON.stringify(this.state.turnos));
  },

  /**
   * Renderiza la interfaz principal dentro del contenedor dado.
   * Carga los turnos y muestra la tabla con los turnos.
   * @param {HTMLElement} container Contenedor donde se monta la UI
   */
  render(container) {
    this.container = container;
    this.loadTurnos();
    this.renderUI();
  },

  /**
   * Construye y muestra la tabla de gestión de turnos
   * Añade eventos a botones de crear, editar y eliminar.
   */
  renderUI() {
    const html = `
      <div class="turnos-gestion-container">
        <div class="header">
          <h2>Gestión de Turnos</h2>
          <button class="btn btn-primary" id="btn-nuevo-turno">+ Nuevo turno</button>
        </div>
        <table class="turnos-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Días</th>
              <th>Entrada Normal</th>
              <th>Salida Normal</th>
              <th>Turno Fin Semana</th>
              <th>Entrada Fin Semana</th>
              <th>Salida Fin Semana</th>
              <th>Festivos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${this.state.turnos.map(turno => `
              <tr data-id="${turno.id}">
                <td>${turno.nombre}</td>
                <td>${Array.isArray(turno.dias) ? turno.dias.join(", ") : ''}</td>
                <td>${turno.entradaNormal}</td>
                <td>${turno.salidaNormal}</td>
                <td>${turno.turnoFinSemana?.nombre || '-'}</td>
                <td>${turno.turnoFinSemana?.entrada || '-'}</td>
                <td>${turno.turnoFinSemana?.salida || '-'}</td>
                <td>${turno.aplicarFestivos ? 'Sí' : 'No'}</td>
                <td>
                  <button class="btn-editar">Editar</button>
                  <button class="btn-eliminar">Eliminar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div id="modal-container"></div>
      </div>
    `;

    // Inserta la interfaz en el contenedor principal
    this.container.innerHTML = html;

    // Evento para crear nuevo turno
    this.container.querySelector('#btn-nuevo-turno').addEventListener('click', () => {
      this.openModal('nuevo');
    });

    // Eventos para botones editar
    this.container.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.target.closest('tr').dataset.id;
        this.openModal('editar', id);
      });
    });

    // Eventos para botones eliminar
    this.container.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.target.closest('tr').dataset.id;
        this.eliminarTurno(id);
      });
    });
  },

  /**
   * Abre el modal principal para crear o editar turno.
   * Si es edición, carga los datos del turno correspondiente.
   * @param {'nuevo'|'editar'} modo 
   * @param {string|null} id ID del turno para editar, null si nuevo
   */
  openModal(modo, id = null) {
    this.state.modal.visible = true;
    this.state.modal.modo = modo;
    this.state.modal.modalFSVisible = false; // Siempre ocultar modal fin de semana al abrir el principal

    if (modo === 'editar') {
      this.state.modal.turnoEdit = this.state.turnos.find(t => t.id === id);
    } else {
      // Inicializa nuevo turno con valores por defecto
      this.state.modal.turnoEdit = {
        nombre: '',
        dias: [],
        entradaNormal: '08:00',
        salidaNormal: '17:00',
        turnoFinSemana: null,
        aplicarFestivos: false,
      };
    }

    this.renderModal();
  },

  /**
   * Abre el modal específico para editar el turno de fines de semana.
   */
  openModalFinSemana() {
    this.state.modal.modalFSVisible = true;
    this.renderModal();
  },

  /**
   * Cierra el modal de fines de semana y vuelve al modal principal.
   */
  closeModalFinSemana() {
    this.state.modal.modalFSVisible = false;
    this.renderModal();
  },

  /**
   * Renderiza el contenido del modal según el estado actual (principal o fines de semana).
   * Maneja creación, edición y edición de turno fines de semana.
   */
  renderModal() {
    const modalContainer = this.container.querySelector('#modal-container');

    // Si modal no visible, limpia contenido y retorna
    if (!this.state.modal.visible) {
      modalContainer.innerHTML = '';
      return;
    }

    // Modal fines de semana
    if (this.state.modal.modalFSVisible) {
      const tFS = this.state.modal.turnoEdit?.turnoFinSemana || { nombre: '', entrada: '08:00', salida: '17:00' };

      modalContainer.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal" style="max-width: 500px; max-height: 40vh; overflow-y: auto;">
            <div class="modal-header">
              <h3>Turno fines de semana</h3>
              <button class="modal-close-btn" id="modal-close-fs">&times;</button>
            </div>
            <div class="modal-body" style="gap: 1rem; justify-content: flex-start;">
              <div style="flex: 1 1 100%;">
                <label>Nombre del turno (fines de semana)</label>
                <input type="text" id="input-nombre-fin-semana" value="${tFS.nombre}" placeholder="Ej: Fin de semana Nocturno" />
              </div>
              <div style="flex: 1 1 45%;">
                <label>Entrada</label>
                <input type="time" id="input-entrada-fin-semana" value="${tFS.entrada}" />
              </div>
              <div style="flex: 1 1 45%;">
                <label>Salida</label>
                <input type="time" id="input-salida-fin-semana" value="${tFS.salida}" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="btn-cancelar-fs">Cancelar</button>
              <button class="btn btn-primary" id="btn-guardar-fs">Guardar</button>
            </div>
          </div>
        </div>
      `;

      // Eventos del modal fines de semana
      modalContainer.querySelector('#modal-close-fs').addEventListener('click', () => this.closeModalFinSemana());
      modalContainer.querySelector('#btn-cancelar-fs').addEventListener('click', () => this.closeModalFinSemana());

      modalContainer.querySelector('#btn-guardar-fs').addEventListener('click', () => {
        const nombreFS = modalContainer.querySelector('#input-nombre-fin-semana').value.trim();
        const entradaFS = modalContainer.querySelector('#input-entrada-fin-semana').value;
        const salidaFS = modalContainer.querySelector('#input-salida-fin-semana').value;

        // Validación básica
        if (!nombreFS) {
          alert('El nombre del turno para fines de semana es obligatorio.');
          return;
        }
        if (!entradaFS || !salidaFS) {
          alert('Debe ingresar hora de entrada y salida para fines de semana.');
          return;
        }

        // Guarda datos temporales en turnoEdit
        this.state.modal.turnoEdit.turnoFinSemana = { nombre: nombreFS, entrada: entradaFS, salida: salidaFS };

        // Vuelve al modal principal
        this.closeModalFinSemana();
      });

    } else {
      // Modal principal para nuevo o editar turno
      const t = this.state.modal.turnoEdit || {
        nombre: '',
        dias: [],
        entradaNormal: '08:00',
        salidaNormal: '17:00',
        turnoFinSemana: null,
        aplicarFestivos: false,
      };

      const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

      modalContainer.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal" style="max-width: 700px; max-height: 40vh; overflow-y: auto;">
            <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center;">
              <h3>${this.state.modal.modo === 'nuevo' ? 'Crear nuevo turno' : 'Editar turno'}</h3>
              <button class="modal-close-btn" id="modal-close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <div>
                <label>Nombre del turno</label>
                <input type="text" id="input-nombre" value="${t.nombre}" placeholder="Ej: Nocturno" />
              </div>
              <div>
                <label>Días asignados</label>
                <div class="days-selector" id="days-selector">
                  ${diasSemana.map(d => {
                    const selectedClass = t.dias.includes(d) ? 'selected' : '';
                    return `<div class="day-btn ${selectedClass}" data-day="${d}">${d.slice(0,3)}</div>`;
                  }).join('')}
                </div>
              </div>
              <div>
                <label>Horario días normales</label>
                <div class="horario-group">
                  <input type="time" id="input-entrada-normal" value="${t.entradaNormal}" />
                  <input type="time" id="input-salida-normal" value="${t.salidaNormal}" />
                </div>
              </div>
              <div style="display:flex; align-items:center; margin-top:1rem;">
                <input type="checkbox" id="input-horario-festivo" ${t.aplicarFestivos ? 'checked' : ''} />
                <label for="input-horario-festivo" style="margin-left: 0.5rem; font-weight:600; color: var(--secondary-text); cursor:pointer;">
                  Aplicar horario especial para días festivos
                </label>
              </div>

              <hr style="margin:1.5rem 0;">

              <div>
                <button class="btn btn-secondary" id="btn-add-fin-semana">+ Crear turno para fines de semana</button>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="btn-cancelar">Cancelar</button>
              <button class="btn btn-primary" id="btn-guardar">${this.state.modal.modo === 'nuevo' ? 'Crear' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      `;

      // Configura eventos para selección múltiple de días con drag y click
      const daysSelector = modalContainer.querySelector('#days-selector');
      let isDragging = false;
      let dragSelecting = null;

      daysSelector.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('mousedown', e => {
          isDragging = true;
          if (btn.classList.contains('selected')) {
            btn.classList.remove('selected');
            dragSelecting = false;
          } else {
            btn.classList.add('selected');
            dragSelecting = true;
          }
        });
        btn.addEventListener('mouseenter', e => {
          if (isDragging) {
            if (dragSelecting) btn.classList.add('selected');
            else btn.classList.remove('selected');
          }
        });
        btn.addEventListener('click', e => {
          if (btn.classList.contains('selected')) btn.classList.remove('selected');
          else btn.classList.add('selected');
        });
      });

      // Finaliza drag al soltar mouse en cualquier parte
      window.addEventListener('mouseup', () => {
        isDragging = false;
        dragSelecting = null;
      });

      // Botones modal principal
      modalContainer.querySelector('#modal-close-btn').addEventListener('click', () => this.closeModal());
      modalContainer.querySelector('#btn-cancelar').addEventListener('click', () => this.closeModal());
      modalContainer.querySelector('#btn-guardar').addEventListener('click', () => this.guardarTurno());

      // Botón para abrir modal de fin de semana
      modalContainer.querySelector('#btn-add-fin-semana').addEventListener('click', () => {
        this.openModalFinSemana();
      });
    }
  },

  /**
   * Guarda los datos del turno desde el modal principal.
   * Valida campos, crea o edita el turno en el estado y actualiza localStorage.
   */
  guardarTurno() {
    const nombre = this.container.querySelector('#input-nombre').value.trim();

    // Obtiene días seleccionados
    const dias = Array.from(this.container.querySelectorAll('.day-btn.selected'))
      .map(el => el.dataset.day);

    const entradaNormal = this.container.querySelector('#input-entrada-normal').value;
    const salidaNormal = this.container.querySelector('#input-salida-normal').value;

    // Datos turno fines de semana
    const nombreFS = this.state.modal.turnoEdit.turnoFinSemana?.nombre || '';
    const entradaFS = this.state.modal.turnoEdit.turnoFinSemana?.entrada || '';
    const salidaFS = this.state.modal.turnoEdit.turnoFinSemana?.salida || '';

    const aplicarFestivos = this.container.querySelector('#input-horario-festivo').checked;

    // Validaciones básicas
    if (!nombre) {
      alert('El nombre del turno es obligatorio.');
      return;
    }
    if (dias.length === 0) {
      alert('Debes seleccionar al menos un día.');
      return;
    }
    if (!entradaNormal || !salidaNormal) {
      alert('Debe ingresar hora de entrada y salida para días normales.');
      return;
    }

    let turnoFinSemana = null;
    if (nombreFS && entradaFS && salidaFS) {
      turnoFinSemana = { nombre: nombreFS, entrada: entradaFS, salida: salidaFS };
    }

    if (this.state.modal.modo === 'nuevo') {
      // Crear nuevo turno con ID único
      const nuevoTurno = {
        id: Date.now().toString(),
        nombre,
        dias,
        entradaNormal,
        salidaNormal,
        turnoFinSemana,
        aplicarFestivos,
      };
      this.state.turnos.push(nuevoTurno);
    } else if (this.state.modal.modo === 'editar' && this.state.modal.turnoEdit) {
      // Editar turno existente
      const turno = this.state.modal.turnoEdit;
      turno.nombre = nombre;
      turno.dias = dias;
      turno.entradaNormal = entradaNormal;
      turno.salidaNormal = salidaNormal;
      turno.turnoFinSemana = turnoFinSemana;
      turno.aplicarFestivos = aplicarFestivos;
    }

    this.saveTurnos();
    this.closeModal();
    this.renderUI();
  },

  /**
   * Cierra cualquier modal abierto y limpia el estado modal.
   */
  closeModal() {
    this.state.modal.visible = false;
    this.state.modal.turnoEdit = null;
    this.state.modal.modalFSVisible = false;
    this.renderModal();
  },

  /**
   * Elimina un turno por ID tras confirmar con el usuario.
   * Actualiza estado y localStorage, luego refresca UI.
   * @param {string} id ID del turno a eliminar
   */
  eliminarTurno(id) {
    if (!confirm('¿Estás seguro de eliminar este turno?')) return;
    this.state.turnos = this.state.turnos.filter(t => t.id !== id);
    this.saveTurnos();
    this.renderUI();
  }
};
