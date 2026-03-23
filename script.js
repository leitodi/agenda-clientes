// Función para mostrar un mensaje cuando se hace clic en el botón
function mostrarMensaje() {
    alert('¡Bienvenido! Gracias por tu interés.');
}

// Función para enviar el formulario
function enviarFormulario(event) {
    event.preventDefault();
    
    // Obtener los valores del formulario
    const form = event.target;
    const nombre = form.elements[0].value;
    const email = form.elements[1].value;
    const mensaje = form.elements[2].value;

    // Validar que los campos no estén vacíos
    if (nombre && email && mensaje) {
        alert(`¡Gracias ${nombre}! Tu mensaje ha sido enviado correctamente. Te contactaremos en: ${email}`);
        form.reset(); // Limpiar el formulario
    } else {
        alert('Por favor completa todos los campos');
    }
}

// Función para scroll hacia el contacto
function scrollToContacto() {
    const contactoSection = document.getElementById('contacto');
    if (contactoSection) {
        contactoSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Función para toggle del FAQ (acordeón)
function toggleFaq(element) {
    const faqItem = element.parentElement;
    const isActive = faqItem.classList.contains('active');
    
    // Cerrar todos los otros FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Abrir el FAQ clickeado si no estaba abierto
    if (!isActive) {
        faqItem.classList.add('active');
    }
}

// Manejar el menú hamburguesa
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    // Cerrar el menú cuando se hace clic en un enlace
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
        link.addEventListener('click', function() {
            if (navLinks) {
                navLinks.style.display = 'none';
            }
        });
    });

    // Animación de scroll suave para los enlaces de navegación
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Abrir el primer FAQ por defecto
    const firstFaqItem = document.querySelector('.faq-item');
    if (firstFaqItem) {
        firstFaqItem.classList.add('active');
    }
});

// Efecto de aparición mientras se hace scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observar las tarjetas de servicios y estadísticas
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.servicio-card, .stat-card, .testimonio-card, .plan-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
});

