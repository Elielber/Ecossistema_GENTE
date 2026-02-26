// --- LÓGICA PRINCIPAL DA APLICAÇÃO (INDEX) ---

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DO CARROSSEL (index.html) ---
    const sliderTrack = document.querySelector('.slider-track');
    if (sliderTrack) {
        setupCarousel(sliderTrack);
    }

    // --- LÓGICA DO MODAL DE DOWNLOAD (Página Inicial) ---
     // 1. Encontra TODOS os botões que abrem modais
    const allOpenButtons = document.querySelectorAll('.open-modal-btn');
    
    // 2. Encontra TODOS os botões de fechar
    const allCloseButtons = document.querySelectorAll('.modal-close');
    
    // 3. Encontra TODOS os overlays (fundos)
    const allModals = document.querySelectorAll('.modal-overlay');

    // Função para abrir um modal específico
    const openModal = (modal) => {
        if (modal == null) return;
        modal.style.display = 'flex';
        setTimeout(() => modal.style.opacity = '1', 10);
    };

    // Função para fechar um modal específico
    const closeModal = (modal) => {
        if (modal == null) return;
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 300);
    };

    // Adiciona o clique a CADA botão de abrir
    allOpenButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Impede o link de pular a página
            const modalId = button.getAttribute('data-target'); // Ex: "#cubo-download-modal"
            const modal = document.querySelector(modalId);
            openModal(modal);
        });
    });

    // Adiciona o clique a CADA botão de fechar
    allCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal-overlay'); // Encontra o modal "pai"
            closeModal(modal);
        });
    });

    // Adiciona o clique a CADA fundo de modal
    allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            // Se o clique foi no fundo (o próprio overlay)
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
// --- LÓGICA DE FILTRO DE FERRAMENTAS ---
    const botoesFiltro = document.querySelectorAll('.btn-filtro');
    const cardsFerramentas = document.querySelectorAll('.ferramenta-card');

    botoesFiltro.forEach(botao => {
        botao.addEventListener('click', () => {
            // Remove a classe active de todos os botões e adiciona no clicado
            botoesFiltro.forEach(b => b.classList.remove('active'));
            botao.classList.add('active');

            const filtroSelecionado = botao.getAttribute('data-filter');

            // Percorre os cards para mostrar ou esconder
            cardsFerramentas.forEach(card => {
                const categoriaCard = card.getAttribute('data-categoria');
                
                if (filtroSelecionado === 'todos' || filtroSelecionado === categoriaCard) {
                    card.classList.remove('escondido');
                    // Uma pequena animação de fade in (opcional, para ficar suave)
                    card.style.opacity = '0';
                    setTimeout(() => card.style.opacity = '1', 50);
                } else {
                    card.classList.add('escondido');
                }
            });
        });
    });
}); // <-- FIM DO 'DOMContentLoaded'

/**
 * Configura o carrossel da página inicial
 */
function setupCarousel(sliderTrack) {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (slides.length > 0 && prevBtn && nextBtn) {
        const slideCount = slides.length;
        
        const firstClone = slides[0].cloneNode(true);
        const lastClone = slides[slideCount - 1].cloneNode(true);
        firstClone.id = 'first-clone';
        lastClone.id = 'last-clone';
        sliderTrack.appendChild(firstClone);
        sliderTrack.prepend(lastClone);
        
        const allSlides = document.querySelectorAll('.slide');
        let currentSlide = 1;
        let autoPlayInterval;

        function goToSlide(slideIndex, animated = true) {
            sliderTrack.style.transition = animated ? 'transform 0.5s ease-in-out' : 'none';
            // Cálculo corrigido para o novo total de slides
            sliderTrack.style.transform = `translateX(-${(slideIndex / (slideCount + 2)) * 100}%)`;
            currentSlide = slideIndex;
        }

        function nextSlide() {
            if (currentSlide >= slideCount + 1) return;
            goToSlide(currentSlide + 1);
        }

        function prevSlide() {
            if (currentSlide <= 0) return;
            goToSlide(currentSlide - 1);
        }

        sliderTrack.addEventListener('transitionend', () => {
            if (allSlides[currentSlide].id === 'first-clone') {
                goToSlide(1, false);
            }
            if (allSlides[currentSlide].id === 'last-clone') {
                goToSlide(slideCount, false);
            }
        });

        function resetAutoPlay() {
            clearInterval(autoPlayInterval);
            autoPlayInterval = setInterval(nextSlide, 20000); // Baner Passa a cada 20 segundos
        }

        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoPlay();
        });

        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoPlay();
        });

        goToSlide(1, false);
        resetAutoPlay();
    }
}
