// Aguarda o HTML ser completamente carregado para então executar o código
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DEFINIÇÃO DAS CONSTANTES ---
    // Mapeamento dos elementos do HTML que vamos manipular
    const storySummaryEl = document.getElementById('story-summary');
    const timelineEl = document.getElementById('timeline');
    const components = {
        problema: document.getElementById('problema-content'),
        hipoteses: document.getElementById('hipoteses-content'),
        metodologia: document.getElementById('metodologia-content')
    };

    let researchData = []; // Variável para armazenar os dados do JSON

    // --- 2. FUNÇÃO PRINCIPAL: CARREGAR DADOS E INICIAR A APLICAÇÃO ---
    async function initializeApp() {
        try {
            const response = await fetch('diario.json');
            if (!response.ok) {
                throw new Error('Falha ao carregar o arquivo diario.json');
            }
            researchData = await response.json();
            
            // Ordena os dados pela data para garantir a sequência correta
            researchData.sort((a, b) => new Date(a.date) - new Date(b.date));

            // Inicia a aplicação com os dados carregados
            renderTimeline();
            // Pega o ID do último episódio para mostrar como estado inicial
            const latestEpisodeId = researchData[researchData.length - 1].id;
            updateDashboard(latestEpisodeId);

        } catch (error) {
            console.error('Erro ao inicializar a aplicação:', error);
            storySummaryEl.textContent = "Não foi possível carregar a jornada da pesquisa. Verifique o console para mais detalhes.";
        }
    }

    // --- 3. FUNÇÃO PARA RENDERIZAR A LINHA DO TEMPO ---
    function renderTimeline() {
        timelineEl.innerHTML = ''; // Limpa a timeline antes de criar
        researchData.forEach(episode => {
            const timelineEvent = document.createElement('div');
            timelineEvent.className = 'timeline-event';
            timelineEvent.innerHTML = `
                <div class="timeline-date">${new Date(episode.date).toLocaleDateString('pt-BR')}</div>
                <div class="timeline-dot"></div>
                <div class="timeline-title">${episode.title}</div>
            `;
            // Adiciona um 'data attribute' para sabermos qual episódio é
            timelineEvent.dataset.episodeId = episode.id;
            timelineEl.appendChild(timelineEvent);
        });
    }

    // --- 4. FUNÇÃO PARA ATUALIZAR O DASHBOARD E O PAINEL DA HISTÓRIA ---
    function updateDashboard(episodeId) {
        const episode = researchData.find(ep => ep.id === episodeId);
        if (!episode) return;

        // Atualiza o painel da história
        storySummaryEl.textContent = episode.summary;

        // Limpa os cards antes de preencher
        Object.values(components).forEach(el => {
            if(el) el.textContent = '...';
        });

        // Preenche os cards com os dados de todos os episódios ATÉ o selecionado
        const relevantHistory = researchData.filter(ep => new Date(ep.date) <= new Date(episode.date));
        
        const currentState = {};

        relevantHistory.forEach(histEpisode => {
            if (histEpisode.updates) {
                Object.assign(currentState, histEpisode.updates);
            }
        });

        // Atualiza o conteúdo dos cards com o estado mais recente
        for (const key in currentState) {
            if (components[key]) {
                // Se for uma lista (como hipóteses), formata como tal
                if (Array.isArray(currentState[key])) {
                    components[key].innerHTML = currentState[key].map(item => `<li>${item}</li>`).join('');
                } else {
                    components[key].textContent = currentState[key];
                }
            }
        }
    }

    // --- 5. ADICIONANDO OS EVENT LISTENERS (A INTERATIVIDADE) ---
    timelineEl.addEventListener('click', (event) => {
        // Procura pelo elemento pai que é um 'timeline-event'
        const eventTarget = event.target.closest('.timeline-event');
        if (eventTarget && eventTarget.dataset.episodeId) {
            const episodeId = parseInt(eventTarget.dataset.episodeId, 10);
            updateDashboard(episodeId);
        }
    });

    // (Opcional, funcionalidade do botão "Ver Histórico" pode ser adicionada depois)

    // --- INICIA TUDO ---
    initializeApp();

});