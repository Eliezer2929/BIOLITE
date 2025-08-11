window.GestionTurnos = {
  state: {
    turnos: [],
    modalVisible: false,
    modalModo: 'crear', // 'crear' o 'editar'
    editTurnoId: null,
  },

  localStorageKey: 'turnosPersonalizados',

  cargarTurnos: function() {
    const data = localStorage.getItem(this.localStorageKey);
    this.state.turnos = data ? JSON.parse(data) : [];
  },

  guardarTurnos: function() {
    localStorage.setItem(this.localStorageKey, JSON.stringify(this.state.turnos));
  },

  render: function(container) {
    this.container = container;
    this.cargarTurnos();

    this.container.innerHTML = `
      <div class="gestion-turnos-container">
        <h2>Gestión de Horarios/Turnos</h2>
        <button id="btn-nuevo-turno" class="btn btn-primary">+ Nuevo Turno</button>
        <table class="turnos-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Hora Entrada</th>
              <th>Hora Salida</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="turnos-tbody"></tbody>
        </table>
        <div id="modal-turno-container"></div>
      </div>
    `;

    document.getElementById('btn-nuevo-turno').addEventListener('click', () => {
      this.abrirModal('crear');
    });

    this.renderTurnos();
  },

  renderTurnos: function() {
    const tbody = this.container.querySelector('#turnos-tbody');
    if (!tbody) return;

    tbody.innerHTML = this.state.turnos.map(turno => `
      <tr data-id="${turno.id}">
        <td>${turno.nombre}</td>
        <td>${turno.horaEntrada}</td>
        <td>${turno.horaSalida}</td>
        <td>
          <button class="btn-editar">Editar</button>
          <button class="btn-eliminar">Eliminar</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-editar').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.target.closest('tr').dataset.id;
        this.abrirModal('editar', id);
      };
    });

    tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.target.closest('tr').dataset.id;
        this.eliminarTurno(id);
      };
    });
  },

  abrirModal: function(modo, id = null) {
    this.state.modalVisible = true;
    this.state.modalModo = modo;
    this.state.editTurnoId = id;

    let turno = { nombre: '', horaEntrada: '08:00', horaSalida: '17:00' };
    if (modo === 'editar') {
      turno = this.state.turnos.find(t => t.id === id) || turno;
    }

    const modalContainer = this.container.querySelector('#modal-turno-container');
    modalContainer.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h3>${modo === 'crear' ? 'Nuevo Turno' : 'Editar Turno'}</h3>
            <button class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <label>Nombre:</label>
            <input type="text" id="input-nombre-turno" value="${turno.nombre}" />
            <label>Hora Entrada:</label>
            <input type="time" id="input-hora-entrada" value="${turno.horaEntrada}" />
            <label>Hora Salida:</label>
            <input type="time" id="input-hora-salida" value="${turno.horaSalida}" />
          </div>
          <div class="modal-footer">
            <button id="btn-guardar-turno" class="btn btn-primary">Guardar</button>
          </div>
        </div>
      </div>
    `;

    modalContainer.querySelector('.modal-close-btn').onclick = () => this.cerrarModal();
    modalContainer.querySelector('#btn-guardar-turno').onclick = () => this.guardarTurno();
  },

  cerrarModal: function() {
    this.state.modalVisible = false;
    this.state.modalModo = 'crear';
    this.state.editTurnoId = null;
    const modalContainer = this.container.querySelector('#modal-turno-container');
    modalContainer.innerHTML = '';
  },

  guardarTurno: function() {
    const nombre = this.container.querySelector('#input-nombre-turno').value.trim();
    const horaEntrada = this.container.querySelector('#input-hora-entrada').value;
    const horaSalida = this.container.querySelector('#input-hora-salida').value;

    if (!nombre || !horaEntrada || !horaSalida) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    if (this.state.modalModo === 'crear') {
      const nuevoTurno = {
        id: Date.now().toString(),
        nombre,
        horaEntrada,
        horaSalida,
      };
      this.state.turnos.push(nuevoTurno);
    } else if (this.state.modalModo === 'editar') {
      const turnoIndex = this.state.turnos.findIndex(t => t.id === this.state.editTurnoId);
      if (turnoIndex >= 0) {
        this.state.turnos[turnoIndex] = { id: this.state.editTurnoId, nombre, horaEntrada, horaSalida };
      }
    }

    this.guardarTurnos();
    this.cerrarModal();
    this.renderTurnos();
  },

  eliminarTurno: function(id) {
    if (confirm('¿Estás seguro de eliminar este turno?')) {
      this.state.turnos = this.state.turnos.filter(t => t.id !== id);
      this.guardarTurnos();
      this.renderTurnos();
    }
  },
};
