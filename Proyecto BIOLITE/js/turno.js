window.Turnos = {
    // Estado global del módulo
    state: {
        empleados: [],          // Lista filtrada de empleados para mostrar
        empleadosOriginal: [],  // Lista original completa de empleados
        turnos: {},             // Horarios asignados a cada empleado, organizados por día
        modal: {                // Estado del modal activo
            visible: false,     // Si el modal está visible o no
            tipo: '',           // Tipo de modal ('patron' o 'horario')
            idEmpleado: null,   // ID empleado para el modal
            dia: null           // Día específico para el modal horario
        },
        gestionTurnos: [],      // Turnos creados en módulo externo (patrones)
    },

    // Abreviaturas para días y meses usados en la tabla
    diasSemana: ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"],
    meses: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],

    /**
     * Carga empleados desde API externa (limita a 10)
     * Inicializa turnos desde localStorage y aplica inicialización a empleados sin turno
     * Carga también los turnos gestionados guardados
     */
    fetchEmpleados: async function () {
        try {
            const res = await fetch("https://fakerapi.it/api/v1/users?_locale=es");
            if (!res.ok) throw new Error("Error cargando empleados");
            const json = await res.json();
            this.state.empleadosOriginal = json.data.slice(0, 10);
            this.state.empleados = [...this.state.empleadosOriginal];
            this.cargarTurnosDesdeLocalStorage();

            // Inicializa turnos para empleados sin asignación previa
            this.state.empleados.forEach(empleado => {
                if (!this.state.turnos[empleado.id]) {
                    this.inicializarTurnos(empleado.id);
                }
            });

            // Carga turnos gestionados desde localStorage
            this.cargarTurnosGestion();
        } catch (error) {
            console.error(error);
            alert("No se pudieron cargar los empleados.");
        }
    },

    /**
     * Carga la lista de turnos gestionados desde localStorage
     * o inicializa arreglo vacío si no existe o hay error
     */
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

    /**
     * Inicializa turnos vacíos para un empleado
     * Cada día queda marcado como libre y sin horas
     * @param {string|number} idEmpleado 
     */
    inicializarTurnos: function (idEmpleado) {
        if (this.state.turnos[idEmpleado]) return;
        this.state.turnos[idEmpleado] = this.diasSemana.reduce((acc, dia) => {
            acc[dia] = { entrada: "-", salida: "-", libre: true };
            return acc;
        }, {});
    },

    /**
     * Guarda el objeto turnos en localStorage como JSON string
     */
    guardarTurnosEnLocalStorage: function() {
        localStorage.setItem("turnos_empleados", JSON.stringify(this.state.turnos));
    },

    /**
     * Carga turnos desde localStorage y actualiza state.turnos
     * En caso de error, inicializa como objeto vacío
     */
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

    /**
     * Renderiza la tabla principal de turnos en el contenedor 'calendar-app'
     * Muestra empleados con sus horarios por día y botones para asignar patrón o editar horario
     */
    renderCalendarTable: function () {
        const appContainer = document.getElementById("calendar-app");
        if (!appContainer) return;

        // Fecha inicio de la semana (lunes)
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));

        // Construye arreglo con día abreviado, fecha y mes para encabezado
        const currentWeekDays = this.diasSemana.map((d, i) => {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            return {
                day: d,
                date: day.getDate(),
                month: this.meses[day.getMonth()],
            };
        });

        // HTML del encabezado de tabla
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

        // Construye filas por empleado
        const bodyHtml = this.state.empleados.map(empleado => {
            const { id, firstname, lastname, gender } = empleado;

            // Ejemplo demo de nivel organizacional basado en id y género
            const nivelOrg = (gender === 'male' || gender === 'female') ?
                (id % 3 === 0 ? 'Gerencia' : (id % 2 === 0 ? 'Ventas' : 'Operaciones')) : 'Recursos Humanos';

            const horarioEmpleado = this.state.turnos[id] || {};

            // Celdas por día con botón para editar horario
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

            // Fila completa del empleado
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

        // Inserta tabla completa en el contenedor
        appContainer.innerHTML = `
            <table class="calendar-table">
                ${headerHtml}
                <tbody>${bodyHtml}</tbody>
            </table>
        `;
    },

    /**
     * Abre modal para asignar patrón o editar horario
     * Guarda el estado modal en `state.modal` y llama a renderizar modal
     * @param {string} tipo 'patron' o 'horario'
     * @param {string|number} idEmpleado 
     * @param {string|null} dia Día abreviado, solo para tipo 'horario'
     */
    openModal: function (tipo, idEmpleado, dia = null) {
        this.state.modal = { visible: true, tipo, idEmpleado, dia };
        this.renderModal();
    },

    /**
     * Cierra modal, limpia estado y vuelve a renderizar modal (vacío)
     */
    closeModal: function () {
        this.state.modal = { visible: false, tipo: '', idEmpleado: null, dia: null };
        this.renderModal();
    },

    /**
     * Renderiza el contenido del modal según tipo actual
     * Modal 'patron': selector de turno gestionado para asignar
     * Modal 'horario': inputs para editar entrada, salida y marcar día libre
     */
    renderModal: function () {
        const patronModalContainer = document.getElementById('patron-modal-container');
        const horarioModalContainer = document.getElementById('horario-modal-container');
        patronModalContainer.innerHTML = '';
        horarioModalContainer.innerHTML = '';

        if (!this.state.modal.visible) return;

        if (this.state.modal.tipo === 'patron') {
            const { idEmpleado } = this.state.modal;

            // Opciones para turnos gestionados o mensaje si no hay ninguno
            const opcionesTurnos = this.state.gestionTurnos.length
                ? this.state.gestionTurnos.map((turno, index) => {
                    return `<option value="${index}">${turno.nombre || `Turno ${index + 1}`}</option>`;
                }).join('')
                : `<option disabled>No hay turnos creados</option>`;

            // Modal HTML para patrón
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

            // Modal HTML para editar horario de día específico
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

            // Habilita o deshabilita inputs según checkbox "Día libre"
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

    /**
     * Aplica el patrón de turno gestionado seleccionado a un empleado
     * Mapea días del patrón a los días abreviados y asigna horarios o días libres
     * @param {string|number} idEmpleado 
     */
    applyPatronGestion: function (idEmpleado) {
        const select = document.getElementById('select-gestion-turno');
        if (!select) return alert("Seleccione un turno válido.");

        const turnoSeleccionado = this.state.gestionTurnos[parseInt(select.value)];
        if (!turnoSeleccionado) return alert("Turno no encontrado.");

        const nuevoTurno = {};

        // Mapa abreviaturas a nombres completos para verificar asignaciones
        const mapDias = {
            'LUN': 'Lunes',
            'MAR': 'Martes',
            'MIÉ': 'Miércoles',
            'JUE': 'Jueves',
            'VIE': 'Viernes',
            'SÁB': 'Sábado',
            'DOM': 'Domingo'
        };

        // Por cada día, verifica si está en los días asignados y asigna horarios correspondientes
        this.diasSemana.forEach(diaAbrev => {
            const diaCompleto = mapDias[diaAbrev];

            const estaAsignado = turnoSeleccionado.dias.includes(diaCompleto);

            if (!estaAsignado) {
                // Día no asignado -> libre
                nuevoTurno[diaAbrev] = { entrada: "-", salida: "-", libre: true };
            } else {
                // Día asignado: distingue fin de semana o día normal
                if (diaCompleto === "Sábado" || diaCompleto === "Domingo") {
                    if (turnoSeleccionado.turnoFinSemana) {
                        nuevoTurno[diaAbrev] = {
                            entrada: turnoSeleccionado.turnoFinSemana.entrada || "-",
                            salida: turnoSeleccionado.turnoFinSemana.salida || "-",
                            libre: false
                        };
                    } else {
                        nuevoTurno[diaAbrev] = {
                            entrada: turnoSeleccionado.entradaNormal,
                            salida: turnoSeleccionado.salidaNormal,
                            libre: false
                        };
                    }
                } else {
                    nuevoTurno[diaAbrev] = {
                        entrada: turnoSeleccionado.entradaNormal,
                        salida: turnoSeleccionado.salidaNormal,
                        libre: false
                    };
                }
            }
        });

        // Actualiza el estado y guarda en localStorage
        this.state.turnos[idEmpleado] = nuevoTurno;
        this.guardarTurnosEnLocalStorage();
        this.closeModal();
        this.renderCalendarTable();
    },

    /**
     * Guarda horario editado manualmente para empleado y día
     * Lee inputs de modal, actualiza estado y guarda localStorage
     * @param {string|number} idEmpleado 
     * @param {string} dia Día abreviado
     */
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

    /**
     * Configura el input de búsqueda para filtrar empleados por nombre o apellido
     */
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

    /**
     * Método inicial para cargar datos y renderizar
     */
    init: async function () {
        await this.fetchEmpleados();
        this.renderCalendarTable();
        this.setupSearch();
    },

    /**
     * Renderiza el HTML base en un contenedor dado y lanza la inicialización
     * @param {HTMLElement} container Contenedor donde se monta el módulo
     * @param {object} options Opciones futuras (no usadas aún)
     */
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
