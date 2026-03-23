// Variables globales
let clientes = [];
let clienteSeleccionado = null;

// API URL
const API_URL = '/api';

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    configurarFormulario();
    configurarModal();
    cargarClientes();
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
        const nuevoCliente = {
            nombre: nombre,
            telefono: telefono,
            instagram: instagram,
            foto1: foto1,
            foto2: foto2
        };

        // Enviar al servidor
        const response = await fetch(`${API_URL}/clientes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoCliente)
        });

        if (!response.ok) {
            throw new Error('Error al guardar el cliente');
        }

        const clienteGuardado = await response.json();

        // Agregar a array local
        clientes.push(clienteGuardado);

        // Limpiar formulario
        document.getElementById('clienteForm').reset();
        document.getElementById('preview-foto1').classList.remove('visible');
        document.getElementById('preview-foto2').classList.remove('visible');

        // Actualizar interfaz
        renderizarListado();

        alert('Cliente guardado correctamente');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Cargar clientes del servidor
async function cargarClientes() {
    try {
        const response = await fetch(`${API_URL}/clientes`);
        if (!response.ok) {
            throw new Error('Error al cargar clientes');
        }
        clientes = await response.json();
        renderizarListado();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('clientesList').innerHTML = '<p class="empty-message">Error al cargar los clientes</p>';
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
             onclick='seleccionarCliente(${JSON.stringify(cliente.id)})'>
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
                <button class="foto-eliminar-btn" onclick='event.stopPropagation(); eliminarFoto(${JSON.stringify(clienteSeleccionado.id)}, 1)'>×</button>
            </div>
            <div class="foto-item" onclick="abrirModal()">
                <img src="${clienteSeleccionado.foto2}" alt="Foto 2">
                <button class="foto-eliminar-btn" onclick='event.stopPropagation(); eliminarFoto(${JSON.stringify(clienteSeleccionado.id)}, 2)'>×</button>
            </div>
        </div>

        <div class="acciones">
            <button class="btn btn-secondary" onclick="cargarNuevaFoto(1)">Cambiar Foto 1</button>
            <button class="btn btn-secondary" onclick="cargarNuevaFoto(2)">Cambiar Foto 2</button>
            <button class="btn btn-danger" onclick='eliminarCliente(${JSON.stringify(clienteSeleccionado.id)})'>Eliminar Cliente</button>
        </div>
    `;
}

// Eliminar foto
async function eliminarFoto(clienteId, numeroFoto) {
    if (confirm('¿Estás seguro de que quieres eliminar esta foto?')) {
        const cliente = clientes.find(c => c.id === clienteId);
        if (cliente) {
            if (numeroFoto === 1) {
                cliente.foto1 = null;
            } else {
                cliente.foto2 = null;
            }
            alert('Debes cargar una nueva foto antes de guardar');
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
                const clienteActualizado = { ...clienteSeleccionado };

                if (numeroFoto === 1) {
                    clienteActualizado.foto1 = fotoBase64;
                } else {
                    clienteActualizado.foto2 = fotoBase64;
                }

                // Actualizar en servidor
                const response = await fetch(`${API_URL}/clientes/${clienteSeleccionado.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(clienteActualizado)
                });

                if (!response.ok) {
                    throw new Error('Error al actualizar el cliente');
                }

                // Actualizar local
                const indice = clientes.findIndex(c => c.id === clienteSeleccionado.id);
                clientes[indice] = clienteActualizado;
                clienteSeleccionado = clienteActualizado;

                mostrarDetallesCliente();
                alert('Foto actualizada correctamente');
            } catch (error) {
                alert('Error al cargar la foto: ' + error.message);
            }
        }
    };

    input.click();
}

// Eliminar cliente
async function eliminarCliente(clienteId) {
    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
        try {
            const response = await fetch(`${API_URL}/clientes/${clienteId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Error al eliminar el cliente');
            }

            // Actualizar local
            clientes = clientes.filter(c => c.id !== clienteId);
            clienteSeleccionado = null;
            renderizarListado();
            mostrarDetallesCliente();
            alert('Cliente eliminado correctamente');
        } catch (error) {
            alert('Error: ' + error.message);
        }
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

