document.addEventListener('DOMContentLoaded', function() {
    // --- LÓGICA DO CARROSSEL COM LOOP INFINITO (VERSÃO CORRIGIDA E LIMPA) ---
    const sliderTrack = document.querySelector('.slider-track');
    if (sliderTrack) {
        const slides = document.querySelectorAll('.slide');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (slides.length > 0) {
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
                autoPlayInterval = setInterval(nextSlide, 10000); // Passa a cada 10 segundos
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

    // --- LÓGICA DOS BOTÕES DE DOWNLOAD (PÁGINA INICIAL) ---
    const downloadButtons = document.querySelectorAll('.btn-download');
    downloadButtons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            alert('Download disponível em breve!');
        });
    });

    // --- LÓGICA DA PÁGINA JORNADA ---
    if (document.body.contains(document.getElementById('timeline'))) {
        
        // (O resto do seu código da página Jornada continua aqui, sem alterações)
        // ...
        
        // FUNÇÕES DE APOIO
        function atualizarCubo(progresso) {
            const cuboImg = document.getElementById('cubo-pesquisa-img');
            if (!cuboImg) return;
            const percentual = parseInt(progresso) || 0;
            let imagemSrc = 'cubo-0.jpg';
            if (percentual >= 100) imagemSrc = 'cubo-100.jpg';
            else if (percentual >= 75) imagemSrc = 'cubo-75.jpg';
            else if (percentual >= 50) imagemSrc = 'cubo-50.jpg';
            else if (percentual > 0) imagemSrc = 'cubo-25.jpg';
            cuboImg.src = imagemSrc;
        }

        function configurarInteratividadeKPIs(kpis) {
            const modalOverlay = document.getElementById('kpi-modal');
            const modalText = document.getElementById('modal-text');
            const closeModalButton = document.querySelector('.modal-close');
            document.querySelectorAll('.kpi-clicavel').forEach(kpiCard => {
                kpiCard.onclick = () => {
                    const kpiId = kpiCard.dataset.kpi;
                    modalText.innerHTML = `<pre>${kpis[kpiId].memoriaDeCalculo}</pre>`;
                    modalOverlay.classList.add('visible');
                };
            });
            closeModalButton.onclick = () => modalOverlay.classList.remove('visible');
            modalOverlay.onclick = (event) => {
                if (event.target === modalOverlay) modalOverlay.classList.remove('visible');
            };
        }

        function atualizarPainel(id, historia) {
            const evento = historia.find(e => e.id === id);
            if (!evento) return;

            document.getElementById('painel-summary-content').innerText = evento.summary;
            document.getElementById('painel-nome-content').innerText = evento.nome;
            document.getElementById('problema-content').innerText = evento.components.problema;
            document.getElementById('hipoteses-content').innerText = evento.components.hipoteses;
            document.getElementById('metodologia-content').innerText = evento.components.metodologia;
            document.getElementById('referencial-content').innerText = evento.components.referencial;
            document.getElementById('impacto-content').innerText = evento.components.impacto;
            document.getElementById('produto-content').innerText = evento.components.produto;

            document.getElementById('kpi-viabilidade-resumo').innerText = evento.kpis.viabilidade.resumo;
            document.getElementById('kpi-prazo-resumo').innerText = evento.kpis.prazo.resumo;
            document.getElementById('kpi-publicidade-resumo').innerText = evento.kpis.publicidade.resumo;

            atualizarCubo(evento.kpis.prazo.resumo);
            configurarInteratividadeKPIs(evento.kpis);

            document.querySelectorAll('.timeline-event').forEach(el => {
                el.classList.toggle('active', el.dataset.id === id);
            });
        }
        
        function preencherTimelineEConfigurarEventos(historia) {
            const timelineContainer = document.getElementById('timeline');
            timelineContainer.innerHTML = ''; 
            historia.forEach((evento, index) => {
                const isActive = index === 0 ? 'active' : '';
                timelineContainer.innerHTML += `
                    <div class="timeline-event ${isActive}" data-id="${evento.id}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-info">
                            <span class="timeline-title">${evento.title}</span>
                            <span class="timeline-date">${new Date(evento.date).toLocaleString('pt-BR')}</span>
                        </div>
                    </div>`;
            });
            timelineContainer.addEventListener('click', (e) => {
                const targetEvent = e.target.closest('.timeline-event');
                if (targetEvent) {
                    atualizarPainel(targetEvent.dataset.id, historia);
                }
            });
        }

        // FUNÇÃO PRINCIPAL
        async function inicializarJornada() {
            try {
                const response = await fetch('dados.json');
                if (!response.ok) throw new Error('Erro na rede ou arquivo não encontrado.');
                const dados = await response.json();
                
                preencherTimelineEConfigurarEventos(dados.historia);
                if (dados.historia.length > 0) {
                    atualizarPainel(dados.historia[0].id, dados.historia);
                }
            } catch (error) {
                console.error('Falha na inicialização:', error);
                document.getElementById('painel-nome-content').innerText = 'Erro ao carregar dados. Verifique o arquivo dados.json.';
            }
        }

        inicializarJornada();
    }
});