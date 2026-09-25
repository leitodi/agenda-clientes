const DEMO_USERS = {
  admin: {
    password: 'aquafast2026',
    role: 'admin',
    name: 'Administrador Aquafast'
  },
  lucia: {
    password: 'ventas2026',
    role: 'seller',
    name: 'Lucia Cabrera'
  }
};

const STORAGE_KEY = 'aquafast-panel-session';

const MODULES = [
  {
    key: 'ventas',
    label: 'Ventas',
    roles: ['admin', 'seller'],
    title: 'Ventas y oportunidades',
    subtitle: 'Seguimiento de cotizaciones, modelos de pileta y próximas acciones comerciales.'
  },
  {
    key: 'instalacion',
    label: 'Instalación',
    roles: ['admin', 'seller'],
    title: 'Instalación y coordinación',
    subtitle: 'Estado de obras, visitas técnicas y checklist operativo para cada cliente.'
  },
  {
    key: 'vendedores',
    label: 'Vendedores',
    roles: ['admin'],
    title: 'Equipo de vendedores',
    subtitle: 'Vista de administrador para medir actividad, cierres y cuentas asignadas.'
  },
  {
    key: 'agenda',
    label: 'Agenda clientes',
    roles: ['admin', 'seller'],
    title: 'Agenda de clientes',
    subtitle: 'Recordatorios diarios, seguimiento de contactos y próximos compromisos.'
  }
];

const MODULE_DATA = {
  ventas: {
    stats: [
      { label: 'Leads activos', value: '36' },
      { label: 'Cotizaciones', value: '14' },
      { label: 'Cierres del mes', value: '5' }
    ],
    render: () => `
      <div class="module-grid two-columns">
        <section class="panel">
          <div class="panel-header">
            <h3>Embudo comercial</h3>
            <span class="pill">Actualizado hoy</span>
          </div>
          <div class="pipeline-grid">
            <article class="pipeline-card">
              <strong>12</strong>
              <span>Consultas nuevas</span>
            </article>
            <article class="pipeline-card">
              <strong>9</strong>
              <span>Visitas técnicas</span>
            </article>
            <article class="pipeline-card">
              <strong>6</strong>
              <span>Propuestas enviadas</span>
            </article>
            <article class="pipeline-card">
              <strong>3</strong>
              <span>Reservas confirmadas</span>
            </article>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <h3>Modelo destacado</h3>
            <span class="pill soft">AQ650</span>
          </div>
          <div class="featured-sale">
            <img src="assets/pool-install-1.jpg" alt="Pileta Aquafast destacada">
            <div>
              <p>Pileta familiar con alta salida comercial para barrios privados y obras nuevas.</p>
              <ul class="clean-list">
                <li>Largo estimado: 6,5 m</li>
                <li>Ticket demo: USD 8.900</li>
                <li>Instalación en 3 etapas</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="panel wide">
          <div class="panel-header">
            <h3>Oportunidades activas</h3>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Interés</th>
                  <th>Estado</th>
                  <th>Próximo paso</th>
                  <th>Vendedor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Familia Sosa</td>
                  <td>AQ650 clásica</td>
                  <td>Cotización enviada</td>
                  <td>Llamar 17:30</td>
                  <td>Lucía</td>
                </tr>
                <tr>
                  <td>Arq. P. Nuñez</td>
                  <td>Línea solarium</td>
                  <td>Lead nuevo</td>
                  <td>Presentación de modelos</td>
                  <td>Martín</td>
                </tr>
                <tr>
                  <td>Barrio Las Cañitas</td>
                  <td>Visita técnica</td>
                  <td>Coordinación</td>
                  <td>Confirmar horario</td>
                  <td>Lucía</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `
  },
  instalacion: {
    stats: [
      { label: 'Obras activas', value: '4' },
      { label: 'Visitas técnicas', value: '7' },
      { label: 'Entregas semanales', value: '2' }
    ],
    render: () => `
      <div class="module-grid two-columns">
        <section class="panel">
          <div class="panel-header">
            <h3>Proceso de instalación</h3>
          </div>
          <div class="timeline">
            <article class="timeline-item">
              <span>01</span>
              <div><strong>Visita técnica</strong><p>Relevamiento del terreno y validación del modelo.</p></div>
            </article>
            <article class="timeline-item">
              <span>02</span>
              <div><strong>Planificación</strong><p>Fecha de obra, materiales y equipo asignado.</p></div>
            </article>
            <article class="timeline-item">
              <span>03</span>
              <div><strong>Instalación</strong><p>Seguimiento por fotos y control de avance.</p></div>
            </article>
            <article class="timeline-item">
              <span>04</span>
              <div><strong>Entrega</strong><p>Capacitación inicial, garantía y postventa.</p></div>
            </article>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <h3>Obra seleccionada</h3>
            <span class="pill">En curso</span>
          </div>
          <div class="stacked-images">
            <img src="assets/pool-install-2.jpg" alt="Proceso de instalación">
            <img src="assets/pool-install-3.jpg" alt="Pileta terminada">
          </div>
        </section>

        <section class="panel wide">
          <div class="panel-header">
            <h3>Agenda operativa</h3>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Modelo</th>
                  <th>Etapa</th>
                  <th>Fecha</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mariana Sosa</td>
                  <td>AQ650</td>
                  <td>Preparación de terreno</td>
                  <td>12/05</td>
                  <td>Martín</td>
                </tr>
                <tr>
                  <td>Country Norte</td>
                  <td>AQ701</td>
                  <td>Visita técnica</td>
                  <td>13/05</td>
                  <td>Lucía</td>
                </tr>
                <tr>
                  <td>Familia Pereyra</td>
                  <td>AQ580</td>
                  <td>Entrega final</td>
                  <td>15/05</td>
                  <td>Coordinación</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `
  },
  vendedores: {
    stats: [
      { label: 'Vendedores', value: '3' },
      { label: 'Cuentas activas', value: '28' },
      { label: 'Cierre promedio', value: '31%' }
    ],
    render: () => `
      <div class="module-grid three-columns">
        <article class="panel seller-card">
          <div class="avatar">LC</div>
          <h3>Lucía Cabrera</h3>
          <p>Zona norte y barrios cerrados</p>
          <div class="metric-line"><strong>11</strong><span>leads activos</span></div>
          <div class="metric-line"><strong>4</strong><span>visitas esta semana</span></div>
        </article>
        <article class="panel seller-card">
          <div class="avatar">MR</div>
          <h3>Martín Roldán</h3>
          <p>Obras nuevas y arquitectos</p>
          <div class="metric-line"><strong>8</strong><span>cotizaciones abiertas</span></div>
          <div class="metric-line"><strong>2</strong><span>cierres pendientes</span></div>
        </article>
        <article class="panel seller-card">
          <div class="avatar">AB</div>
          <h3>Agustina Bianchi</h3>
          <p>Instagram y reactivación</p>
          <div class="metric-line"><strong>29</strong><span>mensajes respondidos hoy</span></div>
          <div class="metric-line"><strong>6</strong><span>leads reactivados</span></div>
        </article>

        <section class="panel wide full-width">
          <div class="panel-header">
            <h3>Configuración futura</h3>
            <span class="pill soft">Próximo paso</span>
          </div>
          <ul class="clean-list">
            <li>Asignar clientes por vendedor</li>
            <li>Definir qué módulos ve cada rol</li>
            <li>Limitar acceso a cuentas propias</li>
            <li>Medir cierres y comisiones por usuario</li>
          </ul>
        </section>
      </div>
    `
  },
  agenda: {
    stats: [
      { label: 'Tareas de hoy', value: '9' },
      { label: 'Llamadas pendientes', value: '4' },
      { label: 'Visitas agendadas', value: '3' }
    ],
    render: () => `
      <div class="module-grid two-columns">
        <section class="panel">
          <div class="panel-header">
            <h3>Agenda del día</h3>
            <span class="pill">09 mayo</span>
          </div>
          <div class="agenda-list">
            <article class="agenda-item">
              <strong>09:30</strong>
              <div>
                <h4>Familia Sosa</h4>
                <p>Enviar segunda propuesta AQ650 + borde perimetral.</p>
              </div>
              <span class="status-tag warm">Cotización</span>
            </article>
            <article class="agenda-item">
              <strong>12:00</strong>
              <div>
                <h4>Barrio Las Cañitas</h4>
                <p>Coordinar visita técnica con Martín.</p>
              </div>
              <span class="status-tag">Visita</span>
            </article>
            <article class="agenda-item">
              <strong>16:45</strong>
              <div>
                <h4>Arq. P. Nuñez</h4>
                <p>Presentación de línea solarium para obra premium.</p>
              </div>
              <span class="status-tag cool">Lead nuevo</span>
            </article>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <h3>Ficha del cliente</h3>
            <span class="pill soft">Activa</span>
          </div>
          <div class="detail-grid">
            <div><span>Nombre</span><strong>Mariana Sosa</strong></div>
            <div><span>Teléfono</span><strong>351 555 0147</strong></div>
            <div><span>Interés</span><strong>AQ650 clásica</strong></div>
            <div><span>Origen</span><strong>Instagram Ads</strong></div>
            <div><span>Estado</span><strong>Esperando visita</strong></div>
            <div><span>Último contacto</span><strong>Hace 2 horas</strong></div>
          </div>
          <div class="note-box">
            <span>Notas internas</span>
            <p>Quiere pileta lista antes de diciembre y pidió opciones de financiación.</p>
          </div>
        </section>
      </div>
    `
  }
};

const loginScreen = document.getElementById('loginScreen');
const appLayout = document.getElementById('appLayout');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginMessage = document.getElementById('loginMessage');
const moduleNav = document.getElementById('moduleNav');
const moduleTitle = document.getElementById('moduleTitle');
const moduleSubtitle = document.getElementById('moduleSubtitle');
const statusCards = document.getElementById('statusCards');
const moduleContent = document.getElementById('moduleContent');
const sessionText = document.getElementById('sessionText');
const sessionBadge = document.getElementById('sessionBadge');
const logoutButton = document.getElementById('logoutButton');
const quickFillButtons = Array.from(document.querySelectorAll('.quick-fill'));

let currentSession = null;
let selectedModule = 'ventas';

function saveSession(session) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function loadSession() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function clearSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function setMessage(message) {
  loginMessage.textContent = message;
  loginMessage.classList.toggle('hidden', !message);
}

function getVisibleModules(role) {
  return MODULES.filter((module) => module.roles.includes(role));
}

function roleLabel(role) {
  return role === 'admin' ? 'Administrador' : 'Vendedor';
}

function renderStatusCards(moduleKey) {
  const stats = MODULE_DATA[moduleKey].stats;
  statusCards.innerHTML = stats
    .map(
      (item) => `
        <article class="status-item">
          <span>${item.value}</span>
          <small>${item.label}</small>
        </article>
      `
    )
    .join('');
}

function renderModule(moduleKey) {
  const moduleDefinition = MODULES.find((item) => item.key === moduleKey);
  if (!moduleDefinition) return;

  selectedModule = moduleKey;
  moduleTitle.textContent = moduleDefinition.title;
  moduleSubtitle.textContent = moduleDefinition.subtitle;
  renderStatusCards(moduleKey);
  moduleContent.innerHTML = MODULE_DATA[moduleKey].render();

  Array.from(moduleNav.querySelectorAll('.module-button')).forEach((button) => {
    button.classList.toggle('active', button.dataset.module === moduleKey);
  });
}

function renderNavigation(role) {
  const visibleModules = getVisibleModules(role);
  if (!visibleModules.some((item) => item.key === selectedModule)) {
    selectedModule = visibleModules[0].key;
  }

  moduleNav.innerHTML = visibleModules
    .map(
      (module) => `
        <button
          type="button"
          class="module-button${module.key === selectedModule ? ' active' : ''}"
          data-module="${module.key}"
        >
          ${module.label}
        </button>
      `
    )
    .join('');

  Array.from(moduleNav.querySelectorAll('.module-button')).forEach((button) => {
    button.addEventListener('click', () => {
      renderModule(button.dataset.module);
    });
  });

  renderModule(selectedModule);
}

function showApp(session) {
  currentSession = session;
  loginScreen.classList.add('hidden');
  appLayout.classList.remove('hidden');
  sessionBadge.textContent = roleLabel(session.role);
  sessionText.textContent = `${session.name} conectado`;
  renderNavigation(session.role);
}

function showLogin() {
  currentSession = null;
  appLayout.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginForm.reset();
  setMessage('');
}

function authenticate(username, password) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const user = DEMO_USERS[normalizedUsername];
  if (!user || user.password !== password) return null;

  return {
    username: normalizedUsername,
    role: user.role,
    name: user.name
  };
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const session = authenticate(usernameInput.value, passwordInput.value);

  if (!session) {
    setMessage('Usuario o clave incorrectos. Usa los accesos demo.');
    return;
  }

  saveSession(session);
  showApp(session);
});

quickFillButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const username = button.dataset.demoUser;
    usernameInput.value = username;
    passwordInput.value = DEMO_USERS[username].password;
    setMessage('');
  });
});

logoutButton.addEventListener('click', () => {
  clearSession();
  showLogin();
});

const storedSession = loadSession();
if (storedSession && DEMO_USERS[storedSession.username]) {
  showApp(storedSession);
} else {
  showLogin();
}
