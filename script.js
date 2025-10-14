document.addEventListener('DOMContentLoaded', function() {

    // --- LÓGICA DA PÁGINA INICIAL ---
    const downloadButtons = document.querySelectorAll('.btn-download');
    downloadButtons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            alert('Download disponível em breve!');
        });
    });

    // --- LÓGICA DA PÁGINA JORNADA ---
    if (document.body.contains(document.getElementById('timeline'))) {
        
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

            // Mapeamento dos campos conforme solicitado
            document.getElementById('painel-summary-content').innerText = evento.summary;
            document.getElementById('painel-nome-content').innerText = evento.nome;
            document.getElementById('problema-content').innerText = evento.components.problema;
            document.getElementById('hipoteses-content').innerText = evento.components.hipoteses;
            document.getElementById('metodologia-content').innerText = evento.components.metodologia;
            document.getElementById('referencial-content').innerText = evento.components.referencial;
            document.getElementById('impacto-content').innerText = evento.components.impacto;
            document.getElementById('produto-content').innerText = evento.components.produto;

            // Atualiza os KPIs
            document.getElementById('kpi-viabilidade-resumo').innerText = evento.kpis.viabilidade.resumo;
            document.getElementById('kpi-prazo-resumo').innerText = evento.kpis.prazo.resumo;
            document.getElementById('kpi-publicidade-resumo').innerText = evento.kpis.publicidade.resumo;

            // Atualiza o Cubo
            atualizarCubo(evento.kpis.prazo.resumo);
            
            // Reconfigura a interatividade dos KPIs para o episódio atual
            configurarInteratividadeKPIs(evento.kpis);

            // Atualiza o item ativo na timeline
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
                            <span class="timeline-date">${new Date(evento.date).toLocaleDateString('pt-BR')}</span>
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