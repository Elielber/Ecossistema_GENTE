// Aguarda o conteúdo da página carregar completamente
document.addEventListener('DOMContentLoaded', function() {

    // --- FUNCIONALIDADE DOS BOTÕES DE DOWNLOAD (PÁGINA INICIAL) ---
    const downloadButtons = document.querySelectorAll('.btn-download');
    downloadButtons.forEach(function(button) {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            alert('Download disponível em breve!');
        });
    });

    // --- LÓGICA DA PÁGINA JORNADA ---
    if (document.body.contains(document.getElementById('timeline'))) {
        
        // FUNÇÕES DE APOIO (declaradas primeiro)
        function preencherDashboard(dados) {
            document.getElementById('kpi-viabilidade-resumo').innerText = dados.kpis.viabilidade.resumo;
            document.getElementById('kpi-prazo-resumo').innerText = dados.kpis.prazo.resumo;
            document.getElementById('kpi-publicidade-resumo').innerText = dados.kpis.publicidade.resumo;
        }
        
        function preencherTimeline(historia) {
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
                    </div>
                `;
            });
        }
       
        function atualizarPainel(id, historia) {
            const evento = historia.find(e => e.id === id);
            if (!evento) return;

            document.getElementById('painel-episodio-numero').innerText = `Episódio #${evento.id.replace('ep','')}`;
            document.getElementById('painel-titulo-texto').innerText = evento.title;
            document.getElementById('problema-content').innerText = evento.components.problema;
            document.getElementById('hipoteses-content').innerText = evento.components.hipoteses;
            document.getElementById('metodologia-content').innerText = evento.components.metodologia;
            document.getElementById('referencial-content').innerText = evento.components.referencial || 'A ser preenchido...';
            document.getElementById('impacto-content').innerText = evento.components.impacto || 'A ser preenchido...';
            document.getElementById('produto-content').innerText = evento.components.produto || 'A ser preenchido...';

            document.querySelectorAll('.timeline-event').forEach(el => {
                el.classList.toggle('active', el.dataset.id === id);
            });
        }

        function configurarInteratividade(historia) {
            const timelineContainer = document.getElementById('timeline');
            timelineContainer.addEventListener('click', function(e) {
                const targetEvent = e.target.closest('.timeline-event');
                if (targetEvent) {
                    atualizarPainel(targetEvent.dataset.id, historia);
                }
            });
            if (historia.length > 0) {
                atualizarPainel(historia[0].id, historia);
            }
        }

        function configurarInteratividadeKPIs(dados) {
            const painelDetalhe = document.getElementById('painel-detalhe-content');
            const kpisClicaveis = document.querySelectorAll('.kpi-clicavel');

            kpisClicaveis.forEach(kpi => {
                kpi.addEventListener('click', () => {
                    const kpiId = kpi.dataset.kpi;
                    const memoriaDeCalculo = dados.kpis[kpiId].memoriaDeCalculo;
                    painelDetalhe.innerHTML = `<pre>${memoriaDeCalculo}</pre>`; 
                });
            });
        }

        // FUNÇÃO PRINCIPAL (executada ao carregar a página)
        async function inicializarJornada() {
            try {
                const response = await fetch('dados.json');
                if (!response.ok) { throw new Error('Erro ao carregar os dados da pesquisa.'); }
                const dados = await response.json();
                
                preencherDashboard(dados);
                preencherTimeline(dados.historia);
                configurarInteratividade(dados.historia);
                configurarInteratividadeKPIs(dados);

            } catch (error) {
                console.error('Falha na inicialização:', error);
                const painelTitulo = document.getElementById('painel-titulo-texto');
                if(painelTitulo) painelTitulo.innerText = 'Erro ao carregar dados. Verifique o arquivo dados.json.';
            }
        }

        // Inicia tudo
        inicializarJornada();
    }

});
