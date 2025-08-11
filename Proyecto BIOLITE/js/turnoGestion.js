window.TurnoGestion = {
  state: {
    turnos: [],  // { id, nombre, dias, entradaNormal, salidaNormal, turnoFinSemana: {nombre, entrada, salida}, aplicarFestivos }
    modal: { visible: false, modo: '', turnoEdit: null, modalFSVisible: false },
  },

  loadTurnos() {
    const data = localStorage.getItem('turnosGestion');
    this.state.turnos = data ? JSON.parse(data) : [];
  },

  saveTurnos() {
    localStorage.setItem('turnosGestion', JSON.stringify(this.state.turnos));
  },

  render(container) {
    this.container = container;
    this.loadTurnos();
    this.renderUI();
  },

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

    this.container.innerHTML = html;

    this.container.querySelector('#btn-nuevo-turno').addEventListener('click', () => {
      this.openModal('nuevo');
    });

    this.container.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.target.closest('tr').dataset.id;
        this.openModal('editar', id);
      });
    });

    this.container.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.target.closest('tr').dataset.id;
        this.eliminarTurno(id);
      });
    });
  },

  openModal(modo, id = null) {
    this.state.modal.visible = true;
    this.state.modal.modo = modo;
    this.state.modal.modalFSVisible = false; // ocultar modal fin de semana al abrir modal principal

    if (modo === 'editar') {
      this.state.modal.turnoEdit = this.state.turnos.find(t => t.id === id);
    } else {
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

  openModalFinSemana() {
    this.state.modal.modalFSVisible = true;
    this.renderModal();
  },

  closeModalFinSemana() {
    this.state.modal.modalFSVisible = false;
    this.renderModal();
  },

  renderModal() {
    const modalContainer = this.container.querySelector('#modal-container');
    if (!this.state.modal.visible) {
      modalContainer.innerHTML = '';
      return;
    }

    if (this.state.modal.modalFSVisible) {
      // Modal fines de semana
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

      modalContainer.querySelector('#modal-close-fs').addEventListener('click', () => this.closeModalFinSemana());
      modalContainer.querySelector('#btn-cancelar-fs').addEventListener('click', () => this.closeModalFinSemana());

      modalContainer.querySelector('#btn-guardar-fs').addEventListener('click', () => {
        const nombreFS = modalContainer.querySelector('#input-nombre-fin-semana').value.trim();
        const entradaFS = modalContainer.querySelector('#input-entrada-fin-semana').value;
        const salidaFS = modalContainer.querySelector('#input-salida-fin-semana').value;

        if (!nombreFS) {
          alert('El nombre del turno para fines de semana es obligatorio.');
          return;
        }
        if (!entradaFS || !salidaFS) {
          alert('Debe ingresar hora de entrada y salida para fines de semana.');
          return;
        }

        // Guardar temporal en turnoEdit
        this.state.modal.turnoEdit.turnoFinSemana = { nombre: nombreFS, entrada: entradaFS, salida: salidaFS };

        // Volver modal principal
        this.closeModalFinSemana();
      });

    } else {
      // Modal principal
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

      // Selector días con drag
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

      window.addEventListener('mouseup', () => {
        isDragging = false;
        dragSelecting = null;
      });

      // Botones modal principal
      modalContainer.querySelector('#modal-close-btn').addEventListener('click', () => this.closeModal());
      modalContainer.querySelector('#btn-cancelar').addEventListener('click', () => this.closeModal());
      modalContainer.querySelector('#btn-guardar').addEventListener('click', () => this.guardarTurno());

      // Botón abrir modal fin de semana
      modalContainer.querySelector('#btn-add-fin-semana').addEventListener('click', () => {
        this.openModalFinSemana();
      });
    }
  },

  guardarTurno() {
    const nombre = this.container.querySelector('#input-nombre').value.trim();

    // Días seleccionados
    const dias = Array.from(this.container.querySelectorAll('.day-btn.selected'))
      .map(el => el.dataset.day);

    const entradaNormal = this.container.querySelector('#input-entrada-normal').value;
    const salidaNormal = this.container.querySelector('#input-salida-normal').value;

    // Turno fines de semana (opcional)
    const nombreFS = this.state.modal.turnoEdit.turnoFinSemana?.nombre || '';
    const entradaFS = this.state.modal.turnoEdit.turnoFinSemana?.entrada || '';
    const salidaFS = this.state.modal.turnoEdit.turnoFinSemana?.salida || '';

    const aplicarFestivos = this.container.querySelector('#input-horario-festivo').checked;

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

  closeModal() {
    this.state.modal.visible = false;
    this.state.modal.turnoEdit = null;
    this.state.modal.modalFSVisible = false;
    this.renderModal();
  },

  eliminarTurno(id) {
    if (!confirm('¿Estás seguro de eliminar este turno?')) return;
    this.state.turnos = this.state.turnos.filter(t => t.id !== id);
    this.saveTurnos();
    this.renderUI();
  }
};
