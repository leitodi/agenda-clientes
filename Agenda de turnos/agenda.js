// Array para almacenar clientes
let clientes = [];
let clienteSeleccionado = null;

// Cargar clientes del localStorage al iniciar
document.addEventListener('DOMContentLoaded', function() {
    cargarClientes();
    configurarFormulario();
    configurarModal();
    renderizarListado();
});

// Configurar el formulario
function configurarFormulario() {
    const form = document.getElementById('clienteForm');
    const foto1Input = document.getElementById('foto1');
    const foto2Input = document.getElementById('foto2');

    // Previsualizaciones de fotos
    foto1Input.addEventListener('change', function(e) {
        mostrarPreview(e.target, 'preview-foto1');
    });

    foto2Input.addEventListener('change', function(e) {
        mostrarPreview(e.target, 'preview-foto2');
    });

    // Envío del formulario
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        agregarCliente();
    });
}

// Mostrar preview de foto
function mostrarPreview(input, previewId) {
    const preview = document.getElementById(previewId);

    if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.add('visible');
        };

        reader.readAsDataURL(input.files[0]);
    }
}

// Convertir archivo a base64
function convertirABase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Agregar nuevo cliente
async function agregarCliente() {
    const nombre = document.getElementById('nombre').value;
    const telefono = document.getElementById('telefono').value;
    const instagram = document.getElementById('instagram').value;
    const foto1Input = document.getElementById('foto1');
    const foto2Input = document.getElementById('foto2');

    // Validar que haya al menos una foto
    if (!foto1Input.files[0] || !foto2Input.files[0]) {
        alert('Por favor carga ambas fotos');
        return;
    }

    try {
        // Convertir fotos a base64
        const foto1 = await convertirABase64(foto1Input.files[0]);
        const foto2 = await convertirABase64(foto2Input.files[0]);

        // Crear objeto cliente
        const cliente = {
            id: Date.now(),
            nombre: nombre,
            telefono: telefono,
            instagram: instagram,
            foto1: foto1,
            foto2: foto2
        };

        // Agregar a array
        clientes.push(cliente);

        // Guardar en localStorage
        guardarClientes();

        // Limpiar formulario
        document.getElementById('clienteForm').reset();
        document.getElementById('preview-foto1').classList.remove('visible');
        document.getElementById('preview-foto2').classList.remove('visible');

        // Actualizar interfaz
        renderizarListado();

        alert('Cliente guardado correctamente');
    } catch (error) {
        alert('Error al cargar las fotos: ' + error);
    }
}

// Guardar clientes en localStorage
function guardarClientes() {
    localStorage.setItem('clientes', JSON.stringify(clientes));
}

// Cargar clientes de localStorage
function cargarClientes() {
    const clientesGuardados = localStorage.getItem('clientes');
    if (clientesGuardados) {
        clientes = JSON.parse(clientesGuardados);
    }
}

// Renderizar listado de clientes
function renderizarListado() {
    const clientesList = document.getElementById('clientesList');

    if (clientes.length === 0) {
        clientesList.innerHTML = '<p class="empty-message">No hay clientes aún</p>';
        return;
    }

    clientesList.innerHTML = clientes.map(cliente => `
        <div class="cliente-item ${clienteSeleccionado && clienteSeleccionado.id === cliente.id ? 'active' : ''}" 
             onclick="seleccionarCliente(${cliente.id})">
            <div class="cliente-item-nombre">${cliente.nombre}</div>
            <div class="cliente-item-telefono">${cliente.telefono}</div>
        </div>
    `).join('');
}

// Seleccionar cliente
function seleccionarCliente(clienteId) {
    clienteSeleccionado = clientes.find(c => c.id === clienteId);
    renderizarListado();
    mostrarDetallesCliente();
}

// Mostrar detalles del cliente
function mostrarDetallesCliente() {
    const detallesDiv = document.getElementById('clienteDetalles');

    if (!clienteSeleccionado) {
        detallesDiv.innerHTML = '<p class="empty-message">Selecciona un cliente para ver los detalles</p>';
        return;
    }

    detallesDiv.innerHTML = `
        <div class="cliente-info">
            <h3 style="color: var(--color-primary); margin-bottom: 1.5rem;">${clienteSeleccionado.nombre}</h3>

            <div class="info-field">
                <span class="info-label">📞 Teléfono:</span>
                <span class="info-value">
                    <a href="tel:${clienteSeleccionado.telefono}">${clienteSeleccionado.telefono}</a>
                </span>
            </div>

            <div class="info-field">
                <span class="info-label">📱 Instagram:</span>
                <span class="info-value">
                    ${clienteSeleccionado.instagram ? `<a href="https://instagram.com/${clienteSeleccionado.instagram}" target="_blank">@${clienteSeleccionado.instagram}</a>` : 'No registrado'}
                </span>
            </div>
        </div>

        <div class="fotos-display">
            <div class="foto-item" onclick="abrirModal()">
                <img src="${clienteSeleccionado.foto1}" alt="Foto 1">
                <button class="foto-eliminar-btn" onclick="event.stopPropagation(); eliminarFoto(${clienteSeleccionado.id}, 1)">×</button>
            </div>
            <div class="foto-item" onclick="abrirModal()">
                <img src="${clienteSeleccionado.foto2}" alt="Foto 2">
                <button class="foto-eliminar-btn" onclick="event.stopPropagation(); eliminarFoto(${clienteSeleccionado.id}, 2)">×</button>
            </div>
        </div>

        <div class="acciones">
            <button class="btn btn-secondary" onclick="cargarNuevaFoto(1)">Cambiar Foto 1</button>
            <button class="btn btn-secondary" onclick="cargarNuevaFoto(2)">Cambiar Foto 2</button>
            <button class="btn btn-danger" onclick="eliminarCliente(${clienteSeleccionado.id})">Eliminar Cliente</button>
        </div>
    `;
}

// Eliminar foto
function eliminarFoto(clienteId, numeroFoto) {
    if (confirm('¿Estás seguro de que quieres eliminar esta foto?')) {
        const cliente = clientes.find(c => c.id === clienteId);
        if (cliente) {
            if (numeroFoto === 1) {
                cliente.foto1 = null;
                alert('Debes cargar una nueva foto 1 antes de guardar');
            } else {
                cliente.foto2 = null;
                alert('Debes cargar una nueva foto 2 antes de guardar');
            }
            mostrarDetallesCliente();
        }
    }
}

// Cargar nueva foto
function cargarNuevaFoto(numeroFoto) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async function(e) {
        if (e.target.files[0]) {
            try {
                const fotoBase64 = await convertirABase64(e.target.files[0]);
                const cliente = clientes.find(c => c.id === clienteSeleccionado.id);

                if (numeroFoto === 1) {
                    cliente.foto1 = fotoBase64;
                } else {
                    cliente.foto2 = fotoBase64;
                }

                guardarClientes();
                mostrarDetallesCliente();
                alert('Foto actualizada correctamente');
            } catch (error) {
                alert('Error al cargar la foto: ' + error);
            }
        }
    };

    input.click();
}

// Eliminar cliente
function eliminarCliente(clienteId) {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
        clientes = clientes.filter(c => c.id !== clienteId);
        guardarClientes();
        clienteSeleccionado = null;
        renderizarListado();
        mostrarDetallesCliente();
        alert('Cliente eliminado correctamente');
    }
}

// Configurar modal
function configurarModal() {
    const modal = document.getElementById('fotoModal');
    const modalClose = document.querySelector('.modal-close');

    modalClose.addEventListener('click', function() {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Cerrar con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modal.classList.remove('active');
        }
    });
}

// Abrir modal con fotos en grande
function abrirModal() {
    if (!clienteSeleccionado) return;

    const modal = document.getElementById('fotoModal');
    const modalFoto1 = document.getElementById('modalFoto1');
    const modalFoto2 = document.getElementById('modalFoto2');

    modalFoto1.src = clienteSeleccionado.foto1;
    modalFoto2.src = clienteSeleccionado.foto2;

    modal.classList.add('active');
}
