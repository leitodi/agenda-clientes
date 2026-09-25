import { useEffect, useState } from 'react';
import './styles.css';

const carouselSlides = [
  {
    image: '/assets/pool-install-1.jpg',
    label: 'AQUAFAST',
    title: 'Piscinas e instalaciones',
    text: 'Mantenimiento tecnico, limpieza y puesta en marcha con seguimiento visual.',
  },
  {
    image: '/assets/pool-install-2.jpg',
    label: 'REGISTRO COMERCIAL',
    title: 'Ventas e instalaciones',
    text: 'Organiza clientes, ventas e instalaciones desde un solo panel.',
  },
  {
    image: '/assets/pool-install-3.jpg',
    label: 'OBRAS ACTIVAS',
    title: 'Control de cada etapa',
    text: 'Visualiza trabajos en curso, materiales y avances de instalacion.',
  },
];

const modules = [
  { key: 'dashboard', label: 'Inicio' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'caja', label: 'Caja' },
  { key: 'instalaciones', label: 'Instalaciones' },
];

const dashboardMetrics = [
  { label: 'Semana del 04/05/2026 al 10/05/2026', value: '3' },
  { label: 'Ventas registradas hoy', value: '1' },
];

const moduleData = {
  clientes: {
    tag: 'CLIENTES',
    title: 'Gestion de clientes',
    text: 'Aca vamos a cargar fichas, telefonos, zonas, historial e imagenes de trabajos.',
    cards: ['Ficha principal', 'Historial', 'Datos de contacto'],
  },
  caja: {
    tag: 'CAJA',
    title: 'Control de caja',
    text: 'Modulo pensado para cobros, movimientos del dia y resumen rapido por servicio.',
    cards: ['Ingresos', 'Movimientos', 'Resumen diario'],
  },
  instalaciones: {
    tag: 'INSTALACIONES',
    title: 'Seguimiento de instalaciones',
    cards: ['Obras activas', 'Etapas', 'Materiales'],
  },
};

const clientsMock = [
  {
    id: 'CL-001',
    firstName: 'IGNACIO',
    lastName: 'BRUNO',
    phone: '11 5555 1280',
    birthday: '07/05/1989',
    address: 'AV. DEL LIBERTADOR 240, TIGRE',
  },
  {
    id: 'CL-002',
    firstName: 'RAMON',
    lastName: 'FARIAS',
    phone: '11 6149 5040',
    birthday: '29/07/1975',
    address: 'BARRIO SAN MARCO 118, ESCOBAR',
  },
  {
    id: 'CL-003',
    firstName: 'MARIANA',
    lastName: 'LOPEZ',
    phone: '11 4890 2277',
    birthday: '14/11/1991',
    address: 'RUTA 27 KM 3.5, BENAVIDEZ',
  },
];

const installationSchedule = {
  12: [
    {
      contract: 'AF-24051',
      client: 'FAMILIA RODRIGUEZ',
      address: 'BARRIO LOS LAGOS 184, ESCOBAR',
      pool: '8 X 4 SKIMMER',
      installer: 'JUAN PEREZ',
      seller: 'MARTIN LOPEZ',
    },
    {
      contract: 'AF-24052',
      client: 'CLUB NAUTICO DELTA',
      address: 'RUTA 27 KM 4, TIGRE',
      pool: '10 X 5 BORDE INFINITO',
      installer: 'LEANDRO SOSA',
      seller: 'SOFIA GOMEZ',
    },
    {
      contract: 'AF-24053',
      client: 'ESTANCIA LA RESERVA',
      address: 'CAMINO REAL 920, PILAR',
      pool: '7 X 3.5 CON JACUZZI',
      installer: 'DARIO FERNANDEZ',
      seller: 'PAULA RUIZ',
    },
  ],
};

const installationCalendarCells = [
  null,
  null,
  null,
  null,
  ...Array.from({ length: 31 }, (_, index) => index + 1),
];

const getInstallationsCountByDay = (day) => {
  if (installationSchedule[day]) return installationSchedule[day].length;
  return 0;
};

function DashboardView() {
  return (
    <>
      <div className="content-header">
        <h2>Inicio</h2>
      </div>

      <div className="date-block">
        <label htmlFor="dashboard-date">Fecha</label>
        <div className="date-controls">
          <input id="dashboard-date" type="text" value="09/05/2026" readOnly />
          <button type="button">Actualizar</button>
        </div>
      </div>

      <div className="metrics-grid">
        {dashboardMetrics.map((item) => (
          <article className="metric-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="insight-card">
        <strong>Inicio rapido AQUAFAST</strong>
        <p>
          El inicio muestra la fecha del dia, la cantidad de instalaciones de la semana dentro del
          rango lunes a domingo y las ventas registradas en el dia en curso.
        </p>
      </div>
    </>
  );
}

function ModuleView({ module }) {
  return (
    <>
      <div className="content-header">
        <div>
          <p className="section-tag">{module.tag}</p>
          <h2>{module.title}</h2>
        </div>
      </div>

      <div className="insight-card">
        <strong>{module.text}</strong>
        <p>Esta parte queda lista para que me digas despues que informacion va dentro del modulo.</p>
      </div>

      <div className="metrics-grid">
        {module.cards.map((card) => (
          <article className="metric-card" key={card}>
            <span>Seccion</span>
            <strong>{card}</strong>
          </article>
        ))}
      </div>
    </>
  );
}

function ClientsView() {
  const [search, setSearch] = useState('');

  const filteredClients = clientsMock.filter((client) => {
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  return (
    <>
      <div className="content-header">
        <div>
          <p className="section-tag">CLIENTES</p>
          <h2>Agenda de Clientes</h2>
        </div>
      </div>

      <div className="clients-layout">
        <section className="client-form-card">
          <h3>Nuevo cliente</h3>

          <div className="client-form-grid">
            <label>
              <span>Nombre</span>
              <input type="text" placeholder="" readOnly />
            </label>

            <label>
              <span>Apellido</span>
              <input type="text" placeholder="" readOnly />
            </label>

            <label>
              <span>Telefono</span>
              <input type="text" placeholder="351..." readOnly />
            </label>

            <label>
              <span>Fecha de cumpleaños</span>
              <input type="text" placeholder="DD/MM/YYYY" readOnly />
            </label>

            <label>
              <span>Direccion</span>
              <input type="text" placeholder="" readOnly />
            </label>
          </div>

          <button className="primary-action-button" type="button">
            Guardar cliente
          </button>
        </section>

        <section className="clients-results-card">
          <div className="clients-search-panel">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente por nombre o apellido"
              aria-label="Buscar cliente"
            />
            <button className="secondary-action-button" type="button">
              Editar
            </button>

            {search.trim() ? (
              filteredClients.length > 0 ? (
                filteredClients.slice(0, 1).map((client) => (
                  <article className="client-highlight-card" key={client.id}>
                    <strong>
                      {client.firstName} {client.lastName}
                    </strong>
                    <span>Telefono: {client.phone}</span>
                    <span>Cumpleaños: {client.birthday}</span>
                    <span>Direccion: {client.address}</span>
                  </article>
                ))
              ) : (
                <article className="client-highlight-card" key="no-result">
                  <strong>Sin resultados</strong>
                  <span>No encontramos clientes con esa búsqueda.</span>
                </article>
              )
            ) : (
              <article className="client-highlight-card" key="mock-search">
                <strong>Resultado de búsqueda</strong>
                <span>Acá se muestra la ficha resumida del cliente cuando lo buscás.</span>
              </article>
            )}
          </div>

          <div className="clients-list-stack">
            {clientsMock.map((client) => (
              <article className="client-record-card" key={client.id}>
                <strong>
                  {client.firstName} {client.lastName}
                </strong>
                <span>Telefono: {client.phone}</span>
                <span>Cumpleaños: {client.birthday}</span>
                <span>Direccion: {client.address}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function CajaView() {
  return (
    <>
      <div className="content-header">
        <div>
          <p className="section-tag">CAJA</p>
          <h2>Caja - Carga de Ventas</h2>
        </div>
      </div>

      <section className="sales-form-card">
        <div className="sales-form-grid">
          <label>
            <span>Vendedor</span>
            <input type="text" value="Martin Lopez" readOnly />
          </label>

          <label>
            <span>Fecha</span>
            <input type="text" value="09/05/2026" readOnly />
          </label>

          <label>
            <span>Producto</span>
            <input type="text" value="Piscina 8 x 4 con equipo de filtrado" readOnly />
          </label>

          <label>
            <span>Monto</span>
            <input type="text" value="$ 3.250.000" readOnly />
          </label>

          <label>
            <span>Fecha de instalacion</span>
            <input type="text" value="12/05/2026" readOnly />
          </label>

          <label>
            <span>Cliente</span>
            <input type="text" value="Familia Rodriguez" readOnly />
          </label>
        </div>

        <button className="primary-action-button sales-submit-button" type="button">
          Registrar venta
        </button>
      </section>
    </>
  );
}

function InstallationsView({ selectedDay, onSelectDay }) {
  const rows = installationSchedule[selectedDay] || [];
  const weekDays = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
  const selectedDateLabel = `${selectedDay} DE MAYO`;

  return (
    <>
      <div className="content-header">
        <div>
          <p className="section-tag">INSTALACIONES</p>
          <h2>Calendario de instalaciones</h2>
        </div>
      </div>

      <section className="installations-calendar-card">
        <div className="calendar-weekdays">
          {weekDays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="installations-calendar-grid">
          {installationCalendarCells.map((day, index) =>
            day ? (
              <button
                key={day}
                type="button"
                className={selectedDay === day ? 'calendar-day active' : 'calendar-day'}
                onClick={() => onSelectDay(day)}
              >
                <span className="calendar-day-number">{day}</span>
                {getInstallationsCountByDay(day) > 0 ? (
                  <span className="calendar-day-count">{getInstallationsCountByDay(day)}</span>
                ) : null}
              </button>
            ) : (
              <div key={`empty-${index}`} className="calendar-day empty" aria-hidden="true" />
            )
          )}
        </div>
      </section>

      <section className="installation-table-card">
        <div className="installation-table-head">
          <div>
            <p className="section-tag">{selectedDateLabel}</p>
            <h3>Instalaciones del dia {selectedDay}</h3>
          </div>
          <span className="table-badge">{rows.length} programadas</span>
        </div>

        {rows.length > 0 ? (
          <div className="installation-table-wrap">
            <table className="installation-table">
              <thead>
                <tr>
                  <th>Numero de contrato</th>
                  <th>Cliente</th>
                  <th>Direccion</th>
                  <th>Piscina</th>
                  <th>Instalador</th>
                  <th>Vendedor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.contract}>
                    <td>{row.contract}</td>
                    <td>{row.client}</td>
                    <td>{row.address}</td>
                    <td>{row.pool}</td>
                    <td>{row.installer}</td>
                    <td>{row.seller}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="installation-empty-state">
            <strong>No hay instalaciones cargadas para este dia.</strong>
            <p>Selecciona otro dia del almanaque para ver la programacion.</p>
          </div>
        )}
      </section>
    </>
  );
}

function App() {
  const [selectedModule, setSelectedModule] = useState('dashboard');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedInstallationDay, setSelectedInstallationDay] = useState(12);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeSlide = carouselSlides[currentSlide];
  const activeModule = selectedModule === 'dashboard' ? null : moduleData[selectedModule];

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-one" aria-hidden="true" />
      <div className="bg-orb bg-orb-two" aria-hidden="true" />

      <div className="dashboard-layout">
        <section className="hero-card">
          <div className="carousel-stack">
            {carouselSlides.map((slide, index) => (
              <article
                key={slide.image}
                className={index === currentSlide ? 'carousel-slide active' : 'carousel-slide'}
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(3, 11, 16, 0.18), rgba(3, 11, 16, 0.8)), url(${slide.image})`,
                }}
              />
            ))}
          </div>

          <div className="hero-overlay">
            <img className="hero-logo" src="/assets/aquafast-logo.png" alt="AQUAFAST" />
            <p className="hero-label">{activeSlide.label}</p>
            <h1>AQUAFAST</h1>
            <h2>{activeSlide.title}</h2>
            <p>{activeSlide.text}</p>

            <div className="carousel-dots" aria-label="Cambiar imagen">
              {carouselSlides.map((slide, index) => (
                <button
                  key={slide.image}
                  type="button"
                  className={index === currentSlide ? 'carousel-dot active' : 'carousel-dot'}
                  aria-label={`Ir a imagen ${index + 1}`}
                  aria-pressed={index === currentSlide}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="panel-card account-card">
          <div>
            <p className="section-tag">AQUAFAST</p>
            <h3>Panel de gestion</h3>
            <p className="account-user">Usuario: admin (demo)</p>
          </div>

          <button className="logout-button" type="button">
            Cerrar sesion
          </button>
        </aside>

        <aside className="panel-card sidebar-card">
          <nav className="sidebar-nav" aria-label="Navegacion principal">
            {modules.map((module) => (
              <button
                key={module.key}
                type="button"
                className={selectedModule === module.key ? 'sidebar-link active' : 'sidebar-link'}
                onClick={() => setSelectedModule(module.key)}
              >
                {module.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="panel-card content-card">
          {selectedModule === 'dashboard' ? <DashboardView /> : null}
          {selectedModule === 'clientes' ? <ClientsView /> : null}
          {selectedModule === 'caja' ? <CajaView /> : null}
          {selectedModule === 'instalaciones' ? (
            <InstallationsView
              selectedDay={selectedInstallationDay}
              onSelectDay={setSelectedInstallationDay}
            />
          ) : null}
          {selectedModule !== 'dashboard' && selectedModule !== 'instalaciones' && selectedModule !== 'clientes' && selectedModule !== 'caja' ? (
            <ModuleView module={activeModule} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
