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
        
        async function inicializarJornada() {
            try {
                const response = await fetch('dados.json');
                if (!response.ok) {
                    throw new Error('Erro ao carregar os dados da pesquisa.');
                }
                const dados = await response.json();
                
                preencherDashboard(dados);
                preencherTimeline(dados.historia);
                configurarInteratividade(dados.historia);

            } catch (error) {
                console.error('Falha na inicialização:', error);
                document.getElementById('story-summary').innerText = 'Não foi possível carregar os dados da pesquisa. Tente novamente mais tarde.';
            }
        }

        function preencherDashboard(dados) {
            document.getElementById('kpi-cronograma-pct').innerText = dados.kpis.cronogramaConcluido + '%';
            document.getElementById('kpi-cronograma-bar').style.width = dados.kpis.cronogramaConcluido + '%';
            document.getElementById('kpi-artigos-submetidos').innerText = dados.kpis.artigosSubmetidos;
            document.getElementById('kpi-artigos-aceitos').innerText = dados.kpis.artigosAceitos;
            document.getElementById('kpi-riscos-elevados').innerText = dados.kpis.riscosElevados;

            // ***** TRECHO QUE FALTAVA - INÍCIO *****
            const cronogramaContainer = document.getElementById('cronograma-container');
            cronogramaContainer.innerHTML = ''; // Limpa o container
            dados.cronograma.forEach(item => {
                cronogramaContainer.innerHTML += `
                    <div class="gantt-item">
                        <p>${item.etapa}</p>
                        <div class="gantt-bar-bg">
                            <div class="gantt-bar-fill ${item.status}" style="width: ${item.progresso}%;">${item.progresso}%</div>
                        </div>
                    </div>
                `;
            });
            // ***** TRECHO QUE FALTAVA - FIM *****

            const producaoTabela = document.getElementById('producao-table');
            producaoTabela.innerHTML = '<tr><th>Tipo</th><th>Status</th></tr>';
            dados.producaoCientifica.forEach(item => {
                producaoTabela.innerHTML += `<tr><td>${item.tipo}</td><td>${item.status}</td></tr>`;
            });

            const riscosTabela = document.getElementById('riscos-table');
            riscosTabela.innerHTML = '<tr><th>Risco</th><th>Nível</th><th>Ação</th></tr>';
            dados.riscos.forEach(item => {
                riscosTabela.innerHTML += `<tr><td>${item.risco}</td><td>${item.nivel}</td><td>${item.acao}</td></tr>`;
            });
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

    // Agora preenchemos TODOS os campos que estão no HTML
    document.getElementById('story-summary').innerText = evento.summary;
    document.getElementById('problema-content').innerText = evento.components.problema;
    document.getElementById('hipoteses-content').innerText = evento.components.hipoteses;
    document.getElementById('metodologia-content').innerText = evento.components.metodologia;

    // Atualiza a classe 'active' no menu da timeline
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

        inicializarJornada();
    }

});
