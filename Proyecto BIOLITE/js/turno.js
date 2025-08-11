window.Turnos = {
    state: {
        empleados: [],
        empleadosOriginal: [],
        turnos: {},
        modal: { visible: false, tipo: '', idEmpleado: null, dia: null },
        gestionTurnos: [], // turnos creados en módulo Gestión de Turnos
    },

    diasSemana: ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"],
    meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],

    fetchEmpleados: async function () {
        try {
            const res = await fetch("https://fakerapi.it/api/v1/users?_locale=es");
            if (!res.ok) throw new Error("Error cargando empleados");
            const json = await res.json();
            this.state.empleadosOriginal = json.data.slice(0, 10);
            this.state.empleados = [...this.state.empleadosOriginal];
            this.cargarTurnosDesdeLocalStorage();

            // Inicializar turnos para empleados que no tengan asignación
            this.state.empleados.forEach(empleado => {
                if (!this.state.turnos[empleado.id]) {
                    this.inicializarTurnos(empleado.id);
                }
            });

            // Carga turnos gestionados
            this.cargarTurnosGestion();
        } catch (error) {
            console.error(error);
            alert("No se pudieron cargar los empleados.");
        }
    },

    cargarTurnosGestion: function () {
        const turnosStr = localStorage.getItem("turnosGestion");
        if (turnosStr) {
            try {
                this.state.gestionTurnos = JSON.parse(turnosStr);
            } catch {
                this.state.gestionTurnos = [];
            }
        } else {
            this.state.gestionTurnos = [];
        }
    },

    inicializarTurnos: function (idEmpleado) {
        if (this.state.turnos[idEmpleado]) return;
        this.state.turnos[idEmpleado] = this.diasSemana.reduce((acc, dia) => {
            acc[dia] = { entrada: "-", salida: "-", libre: true };
            return acc;
        }, {});
    },

    guardarTurnosEnLocalStorage: function() {
        localStorage.setItem("turnos_empleados", JSON.stringify(this.state.turnos));
    },

    cargarTurnosDesdeLocalStorage: function() {
        const datos = localStorage.getItem("turnos_empleados");
        if (datos) {
            try {
                this.state.turnos = JSON.parse(datos);
            } catch {
                this.state.turnos = {};
            }
        }
    },

    renderCalendarTable: function () {
        const appContainer = document.getElementById("calendar-app");
        if (!appContainer) return;

        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
        const currentWeekDays = this.diasSemana.map((d, i) => {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            return {
                day: d,
                date: day.getDate(),
                month: this.meses[day.getMonth()],
            };
        });

        const headerHtml = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Nivel Organizacional</th>
                    <th>Patrón</th>
                    ${currentWeekDays.map(d => `<th>${d.day}<br>${d.month} ${d.date}</th>`).join('')}
                </tr>
            </thead>
        `;

        const bodyHtml = this.state.empleados.map(empleado => {
            const { id, firstname, lastname, gender } = empleado;
            const nivelOrg = (gender === 'male' || gender === 'female') ?
                (id % 3 === 0 ? 'Gerencia' : (id % 2 === 0 ? 'Ventas' : 'Operaciones')) : 'Recursos Humanos';
            const horarioEmpleado = this.state.turnos[id] || {};

            const celdasHorario = this.diasSemana.map(dia => {
                const turno = horarioEmpleado[dia] || { entrada: "-", salida: "-", libre: true };
                const clase = turno.libre ? 'cell-libre' : 'cell-horario';
                const texto = turno.libre ? 'Libre' : `${turno.entrada} | ${turno.salida}`;
                return `
                    <td>
                        <button class="cell-button ${clase}" onclick="window.Turnos.openModal('horario', '${id}', '${dia}')">
                            ${texto}
                        </button>
                    </td>
                `;
            }).join("");

            return `
                <tr>
                    <td>${id}</td>
                    <td>${firstname}</td>
                    <td>${lastname}</td>
                    <td>${nivelOrg}</td>
                    <td>
                        <button class="cell-button cell-patron" onclick="window.Turnos.openModal('patron', '${id}')">
                            Patrón
                        </button>
                    </td>
                    ${celdasHorario}
                </tr>
            `;
        }).join("");

        appContainer.innerHTML = `
            <table class="calendar-table">
                ${headerHtml}
                <tbody>${bodyHtml}</tbody>
            </table>
        `;
    },

    openModal: function (tipo, idEmpleado, dia = null) {
        this.state.modal = { visible: true, tipo, idEmpleado, dia };
        this.renderModal();
    },

    closeModal: function () {
        this.state.modal = { visible: false, tipo: '', idEmpleado: null, dia: null };
        this.renderModal();
    },

    renderModal: function () {
        const patronModalContainer = document.getElementById('patron-modal-container');
        const horarioModalContainer = document.getElementById('horario-modal-container');
        patronModalContainer.innerHTML = '';
        horarioModalContainer.innerHTML = '';

        if (!this.state.modal.visible) return;

        if (this.state.modal.tipo === 'patron') {
            const { idEmpleado } = this.state.modal;

            const opcionesTurnos = this.state.gestionTurnos.length
                ? this.state.gestionTurnos.map((turno, index) => {
                    return `<option value="${index}">${turno.nombre || `Turno ${index + 1}`}</option>`;
                }).join('')
                : `<option disabled>No hay turnos creados</option>`;

            patronModalContainer.innerHTML = `
                <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999;">
                    <div id="patron-modal" class="modal" 
                        style="
                            background: white; 
                            padding: 1rem 1.5rem;  
                            border-radius: 16px; 
                            width: 400px; 
                            max-width: 90%;
                            height: 220px;
                            max-height: 90vh;
                            display: flex; 
                            flex-direction: column;
                            position: relative;
                        ">
                        <div class="modal-header" style="padding-bottom: 0.3rem; margin-bottom: 0.5rem; border-bottom: 1px solid #ccc;">
                            <h2 style="margin: 0; font-size: 1.25rem;">Asignar turno gestionado</h2>
                            <button class="modal-close-btn" onclick="window.Turnos.closeModal()" 
                                style="position: absolute; top: 10px; right: 15px; font-size: 1.5rem; background: none; border: none; cursor: pointer;">&times;</button>
                        </div>
                        <div class="modal-body" style="flex-grow: 1;">
                            <div class="form-group" style="width: 100%;">
                                <label for="select-gestion-turno" style="display: block; margin-bottom: 0.3rem;">Selecciona un turno creado</label>
                                <select id="select-gestion-turno" style="width: 100%; padding: 0.5rem; font-size: 1rem;">
                                    ${opcionesTurnos}
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer" style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
                            <button class="btn btn-primary" style="padding: 0.4rem 1rem;" onclick="window.Turnos.applyPatronGestion('${idEmpleado}')">Guardar</button>
                            <button class="btn btn-secondary" style="padding: 0.4rem 1rem;" onclick="window.Turnos.closeModal()">Cancelar</button>
                        </div>
                    </div>
                </div>
            `;
        } else if (this.state.modal.tipo === 'horario') {
            const { idEmpleado, dia } = this.state.modal;
            const turnoActual = this.state.turnos[idEmpleado][dia];
            horarioModalContainer.innerHTML = `
                <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999;">
                    <div id="horario-modal" class="modal" 
                        style="
                            background: white; 
                            padding: 1rem 1.5rem;  
                            border-radius: 16px; 
                            width: 400px; 
                            max-width: 90%;
                            height: 250px;
                            display: flex; 
                            flex-direction: column;
                            position: relative;
                        ">
                        <div class="modal-header" style="padding-bottom: 0.3rem; margin-bottom: 0.5rem; border-bottom: 1px solid #ccc;">
                            <h2 style="margin: 0; font-size: 1.25rem;">Cambio de Horario</h2>
                            <button class="modal-close-btn" onclick="window.Turnos.closeModal()" 
                                style="position: absolute; top: 10px; right: 15px; font-size: 1.5rem; background: none; border: none; cursor: pointer;">&times;</button>
                        </div>
                        <div class="modal-body" style="flex-grow: 1;">
                            <div class="form-group" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <input type="time" id="input-entrada" value="${turnoActual.libre ? '08:00' : turnoActual.entrada}" style="flex: 1; min-width: 120px; padding: 0.4rem;" />
                                <input type="time" id="input-salida" value="${turnoActual.libre ? '17:00' : turnoActual.salida}" style="flex: 1; min-width: 120px; padding: 0.4rem;" />
                                <label style="align-self: center; display: flex; gap: 0.3rem; font-weight: normal;">
                                    <input type="checkbox" id="checkbox-libre" ${turnoActual.libre ? 'checked' : ''} />
                                    Día libre
                                </label>
                            </div>
                        </div>
                        <div class="modal-footer" style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
                            <button class="btn btn-primary" style="padding: 0.4rem 1rem;" onclick="window.Turnos.saveHorario('${idEmpleado}', '${dia}')">Guardar</button>
                            <button class="btn btn-secondary" style="padding: 0.4rem 1rem;" onclick="window.Turnos.closeModal()">Cancelar</button>
                        </div>
                    </div>
                </div>
            `;

            // Funcionalidad para deshabilitar inputs si Día libre
            setTimeout(() => {
                const checkboxLibre = document.getElementById('checkbox-libre');
                const inputEntrada = document.getElementById('input-entrada');
                const inputSalida = document.getElementById('input-salida');
                if (!checkboxLibre || !inputEntrada || !inputSalida) return;

                function toggleInputs() {
                    const libre = checkboxLibre.checked;
                    inputEntrada.disabled = libre;
                    inputSalida.disabled = libre;
                }

                checkboxLibre.addEventListener('change', toggleInputs);
                toggleInputs();
            }, 0);
        }
    },

    applyPatronGestion: function (idEmpleado) {
        const select = document.getElementById('select-gestion-turno');
        if (!select) return alert("Seleccione un turno válido.");

        const turnoSeleccionado = this.state.gestionTurnos[parseInt(select.value)];
        if (!turnoSeleccionado) return alert("Turno no encontrado.");

        const nuevoTurno = {};

        // Mapeo de abreviaturas a días completos
        const mapDias = {
            'LUN': 'Lunes',
            'MAR': 'Martes',
            'MIÉ': 'Miércoles',
            'JUE': 'Jueves',
            'VIE': 'Viernes',
            'SÁB': 'Sábado',
            'DOM': 'Domingo'
        };

        this.diasSemana.forEach(diaAbrev => {
            const diaCompleto = mapDias[diaAbrev];

            // Verificamos si el día está dentro de los días asignados al turno
            const estaAsignado = turnoSeleccionado.dias.includes(diaCompleto);

            if (!estaAsignado) {
                // Día no asignado = libre
                nuevoTurno[diaAbrev] = { entrada: "-", salida: "-", libre: true };
            } else {
                // Día asignado: revisamos si es fin de semana
                if (diaCompleto === "Sábado" || diaCompleto === "Domingo") {
                    // Aplicar turnoFinSemana si existe
                    if (turnoSeleccionado.turnoFinSemana) {
                        nuevoTurno[diaAbrev] = {
                            entrada: turnoSeleccionado.turnoFinSemana.entrada || "-",
                            salida: turnoSeleccionado.turnoFinSemana.salida || "-",
                            libre: false
                        };
                    } else {
                        // Si no tiene turno fin de semana definido, aplicar horario normal
                        nuevoTurno[diaAbrev] = {
                            entrada: turnoSeleccionado.entradaNormal,
                            salida: turnoSeleccionado.salidaNormal,
                            libre: false
                        };
                    }
                } else {
                    // Día normal
                    nuevoTurno[diaAbrev] = {
                        entrada: turnoSeleccionado.entradaNormal,
                        salida: turnoSeleccionado.salidaNormal,
                        libre: false
                    };
                }
            }
        });

        this.state.turnos[idEmpleado] = nuevoTurno;

        this.guardarTurnosEnLocalStorage();
        this.closeModal();
        this.renderCalendarTable();
    },


    saveHorario: function (idEmpleado, dia) {
        const checkboxLibre = document.getElementById('checkbox-libre');
        const inputEntrada = document.getElementById('input-entrada');
        const inputSalida = document.getElementById('input-salida');

        if (!this.state.turnos[idEmpleado]) this.state.turnos[idEmpleado] = {};
        if (!this.state.turnos[idEmpleado][dia]) this.state.turnos[idEmpleado][dia] = {};

        if (checkboxLibre.checked) {
            this.state.turnos[idEmpleado][dia] = { entrada: "-", salida: "-", libre: true };
        } else {
            const entrada = inputEntrada.value || "08:00";
            const salida = inputSalida.value || "17:00";
            this.state.turnos[idEmpleado][dia] = { entrada, salida, libre: false };
        }

        this.guardarTurnosEnLocalStorage();

        this.closeModal();
        this.renderCalendarTable();
    },

    setupSearch: function () {
        const searchInput = document.getElementById('employee-search');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                const query = event.target.value.toLowerCase();
                this.state.empleados = this.state.empleadosOriginal.filter(empleado =>
                    empleado.firstname.toLowerCase().includes(query) ||
                    empleado.lastname.toLowerCase().includes(query)
                );
                this.renderCalendarTable();
            });
        }
    },

    init: async function () {
        await this.fetchEmpleados();
        this.renderCalendarTable();
        this.setupSearch();
    },

    render: function (container, options = {}) {
        container.innerHTML = `
            <input type="text" id="employee-search" placeholder="Buscar empleado por nombre o apellido" style="margin-bottom: 1rem; padding: 0.5rem; width: 100%; max-width: 400px;" />
            <div id="calendar-app"></div>
            <div id="patron-modal-container"></div>
            <div id="horario-modal-container"></div>
        `;
        this.appContainer = container;
        this.init();
    }
};
