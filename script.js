// --- 1. FUNÇÕES AUXILIARES DE DATA ---
// (Necessárias para o Gantt e formatação)

/** Converte string 'DD/MM/AAAA' para um objeto Date (UTC) */
function parseDataBR(str) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return null;
    const [dia, mes, ano] = str.split('/').map(Number);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    try {
        const data = new Date(Date.UTC(ano, mes - 1, dia));
        if (data.getUTCFullYear() === ano && data.getUTCMonth() === (mes - 1) && data.getUTCDate() === dia) {
            return data;
        }
        return null;
    } catch (e) { return null; }
}

/** Formata um objeto Date para 'DD/MM/AAAA' */
function formatDataBR(dateObj) {
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    const dia = String(dateObj.getUTCDate()).padStart(2, '0');
    const mes = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const ano = dateObj.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
}

/** Converte string 'AAAA-MM-DD' para um objeto Date (UTC) */
function parseDataISO(str) {
     if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
     try {
        const data = new Date(str + 'T00:00:00Z');
        if (isNaN(data.getTime())) return null;
        return data;
     } catch(e) { return null; }
}

/** Adiciona dias a um objeto Date (modifica o original) */
function adicionarDias(dateObj, dias) {
     dateObj.setUTCDate(dateObj.getUTCDate() + dias);
     return dateObj;
}

/**
 * Encontra a data de início de uma tarefa (Req. Gantt)
 */
function obterDataInicio(tarefa, todasEntregas, visitados = new Set()) {
    if (!tarefa) return null;
    // Evita loop infinito
    if (tarefa.id && visitados.has(tarefa.id)) return null; 
    if (tarefa.id) visitados.add(tarefa.id);

    const anterior = tarefa.anterior || '';
    
    // Tenta parsear data DD/MM/AAAA ou AAAA-MM-DD
    let dataInicio = parseDataBR(anterior) || parseDataISO(anterior);
    if (dataInicio) return dataInicio;

    // Se não for data, procura por ID
    const tarefaAnterior = todasEntregas.find(t => t.id === anterior);
    if (tarefaAnterior) {
        // Recursivo: busca a data de início da tarefa anterior
        const inicioTarefaAnterior = obterDataInicio(tarefaAnterior, todasEntregas, new Set(visitados));
        if (!inicioTarefaAnterior) return null; 
        
        // Calcula a data de conclusão da anterior
        const duracaoAnterior = tarefaAnterior.duracao > 0 ? (tarefaAnterior.duracao - 1) : 0;
        const dataConclusaoAnterior = new Date(inicioTarefaAnterior.getTime());
        adicionarDias(dataConclusaoAnterior, duracaoAnterior);
        
        // A tarefa atual começa no dia *seguinte*
        adicionarDias(dataConclusaoAnterior, 1); 
        return dataConclusaoAnterior;
    }
    return null; // Não encontrou
}


// --- 2. LÓGICA PRINCIPAL DA APLICAÇÃO ---

let dadosPesquisa = null; // Cache dos dados carregados
const MS_POR_DIA = 1000 * 60 * 60 * 24;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DO CARROSSEL (index.html) ---
    // (Mantida, mas verificando se os elementos existem)
    const sliderTrack = document.querySelector('.slider-track');
    if (sliderTrack) {
        setupCarousel(sliderTrack);
    }

    // --- LÓGICA DOS BOTÕES DE DOWNLOAD (index.html) ---
const downloadButtons = document.querySelectorAll('.btn-download');
if (downloadButtons.length > 0) {
    downloadButtons.forEach(button => {
        
        // VERIFICA SE O LINK É UM PLACEHOLDER (href="#")
        if (button.getAttribute('href') === '#') {
            
            // Se for '#', adiciona o bloqueio e o alerta
            button.addEventListener('click', event => {
                event.preventDefault(); 
                alert('Download disponível em breve!');
            });
        }
        // Se o href NÃO for '#', o script não faz nada
        // e o link de download funciona normalmente.
    });
}


    // --- LÓGICA DA PÁGINA JORNADA ---
    // (Totalmente refeita)
    if (document.body.contains(document.getElementById('timeline'))) {
        inicializarJornada();
    }
});

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


// --- 3. LÓGICA DA PÁGINA JORNADA (NOVA) ---

async function inicializarJornada() {
    setupModalListeners(); // Configura os botões do modal (fechar, etc.)
    try {
        const response = await fetch('dados.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        dadosPesquisa = await response.json();
        
        if (!dadosPesquisa || !dadosPesquisa.historia) throw new Error("JSON inválido");
        
        // --- MODIFICAÇÃO (Req 1) ---
        // Ordena por data ASCENDENTE (a.date - b.date). 'ep00' no topo.
        dadosPesquisa.historia.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        setupTimeline(dadosPesquisa.historia);
        
        // Exibe o primeiro da lista (o mais antigo, ep00) por padrão
        if(dadosPesquisa.historia.length > 0) {
            displayEpisodio(dadosPesquisa.historia[0]);
        }
    } catch (error) {
        console.error("Falha ao carregar dados:", error);
        document.getElementById('painel-nome-content').innerText = "Erro ao carregar dados.json.";
    }
}
function setupTimeline(historia) {
    const timelineContainer = document.getElementById('timeline');
    timelineContainer.innerHTML = ''; // Limpa
    
    historia.forEach((episodio, index) => {
        const epElement = document.createElement('div');
        epElement.className = 'timeline-item';
        epElement.dataset.id = episodio.id; // Salva o ID
        
        // --- MODIFICAÇÃO (Req 2) ---
        // Altera a estrutura do HTML gerado
        epElement.innerHTML = `
            <div class="timeline-title-wrapper">
                <span class="timeline-title">${episodio.title}</span>
            </div>
            <div class="timeline-meta-wrapper">
                <div class="timeline-dot"></div>
                <span class="timeline-date">${formatDataBR(parseDataISO(episodio.date))}</span>
                <span class="timeline-id">(${episodio.id})</span>
            </div>
        `;
        
        epElement.onclick = () => {
            displayEpisodio(episodio);
        };
        
        // Marca o primeiro (mais antigo, ep00) como ativo
        if (index === 0) {
            epElement.classList.add('active');
        }
        
        timelineContainer.appendChild(epElement);
    });
}

/**
 * Exibe os dados de um episódio específico no painel
 */
function displayEpisodio(episodio) {
    if (!episodio) return;

    // Funçao auxiliar para preencher
    const setContent = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value || '--';
    };

    // Ativa o item correto na timeline
    document.querySelectorAll('.timeline-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === episodio.id);
    });

    setContent('painel-nome-content', episodio.nome);
    setContent('painel-summary-content', episodio.summary);

    // Componentes
    setContent('problema-content', episodio.components?.problema);
    setContent('hipoteses-content', episodio.components?.hipoteses);
    setContent('referencial-content', episodio.components?.referencial);
    setContent('metodologia-content', episodio.components?.metodologia);
    setContent('impacto-content', episodio.components?.impacto);
    setContent('produto-content', episodio.components?.produto);

    // Resumos dos KPIs
    setContent('kpi-viabilidade-resumo', episodio.kpis?.viabilidade?.resumo);
    setContent('kpi-prazo-resumo', episodio.kpis?.prazo?.resumo);
    setContent('kpi-publicidade-resumo', episodio.kpis?.publicidade?.resumo);
    
    // Lógica de Tolerância (compatível com formato antigo e novo)
    const toleranciaKPI = episodio.kpis.tolerancia;
    const toleranciaEl = document.getElementById('kpi-tolerancia-resumo');
    if (typeof toleranciaKPI === 'object' && toleranciaKPI !== null && toleranciaKPI.resumo) {
        toleranciaEl.innerText = toleranciaKPI.resumo; // Novo formato
    } else if (typeof toleranciaKPI === 'number') {
        toleranciaEl.innerText = (toleranciaKPI * 100).toFixed(0) + '% (Definida)'; // Formato antigo
    } else {
        toleranciaEl.innerText = '--';
    }

    // Imagem do Cubo
    const cuboImg = document.getElementById('cubo-pesquisa-img');
    if (cuboImg) {
        const imgPath = episodio.kpis?.cuboImagem || 'cubo-E0.png';
        cuboImg.src = imgPath;
        cuboImg.onerror = () => { cuboImg.src = 'cubo-E0.png'; }; 
    }
    
    // ATUALIZA OS LISTENERS DE CLIQUE DO KPI
    setupKPIPanelListeners(episodio);
}

// --- 4. LÓGICA DO MODAL (NOVA) ---

const modalOverlay = document.getElementById('kpi-modal');
const modalText = document.getElementById('modal-text');
const modalClose = document.querySelector('.modal-close');

function setupModalListeners() {
    if (modalOverlay) {
        // Fecha ao clicar fora
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) fecharModal();
        };
    }
    if (modalClose) {
        modalClose.onclick = () => fecharModal();
    }
}

function fecharModal() {
    if (modalOverlay) modalOverlay.classList.remove('visible');
    if (modalText) modalText.innerHTML = ''; // Limpa o conteúdo
}

function abrirModal() {
    if (modalOverlay) modalOverlay.classList.add('visible');
}

/**
 * Adiciona os cliques nos painéis de KPI
 */
function setupKPIPanelListeners(episodio) {
    document.querySelectorAll('.kpi-clicavel').forEach(panel => {
        // Remove listeners antigos para evitar duplicatas (ESSENCIAL)
        const newPanel = panel.cloneNode(true);
        panel.parentNode.replaceChild(newPanel, panel);

        // Adiciona o novo listener
        newPanel.addEventListener('click', () => {
            const kpiType = newPanel.dataset.kpi;
            showKpiModal(kpiType, episodio);
        });
    });
}

/**
 * Direciona para a função correta para construir o HTML do modal
 */
function showKpiModal(kpiType, episodio) {
    let contentHTML = '';
    
    switch (kpiType) {
        case 'viabilidade':
            contentHTML = renderModalViabilidade(episodio);
            break;
        case 'prazo':
            contentHTML = renderModalPrazo(episodio);
            break;
        case 'publicidade':
            contentHTML = renderModalPublicidade(episodio);
            break;
        case 'tolerancia':
            contentHTML = renderModalTolerancia(episodio);
            break;
        default:
            contentHTML = '<p>Tipo de KPI não reconhecido.</p>';
    }
    
    modalText.innerHTML = contentHTML;
    abrirModal();
}

/**
 * (Req 1) Gera o HTML para o modal de VIABILIDADE
 */
function renderModalViabilidade(episodio) {
    const kpi = episodio.kpis?.viabilidade;
    const meta = episodio.kpis?.metaCusto || 0;
    const itens = kpi?.itens || [];

    let tabelaHTML = `
        <div class="meta-destaque">Meta de Custo: R$ ${meta.toFixed(2)}</div>
        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Tipo</th>
                    <th>Data</th>
                    <th>Valor (R$)</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (itens.length === 0) {
        tabelaHTML += '<tr><td colspan="4">Nenhum item de custo cadastrado.</td></tr>';
    } else {
        itens.forEach(item => {
            tabelaHTML += `
                <tr>
                    <td>${item.item || ''}</td>
                    <td>${item.tipo || ''}</td>
                    <td>${formatDataBR(parseDataISO(item.data)) || ''}</td>
                    <td>R$ ${(item.valor || 0).toFixed(2)}</td>
                </tr>
            `;
        });
    }

    tabelaHTML += `
            </tbody>
        </table>
        <div class="bloco-calculo">
            <h4>Resumo do Cálculo</h4>
            ${kpi?.memoriaDeCalculo || 'Cálculo não disponível.'}
        </div>
    `;
    return tabelaHTML;
}

/**
 * (Req 3) Gera o HTML para o modal de PUBLICIDADE
 */
function renderModalPublicidade(episodio) {
    const kpi = episodio.kpis?.publicidade;
    const meta = episodio.kpis?.metaPublicacao || 0;
    const publicacoes = kpi?.publicacoes || [];

    let tabelaHTML = `
        <div class="meta-destaque">Meta de Publicação: ${meta} (Aceitas/Publicadas)</div>
        <table>
            <thead>
                <tr>
                    <th>Título</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Local</th>
                    <th>Submissão</th>
                    <th>Final</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    if (publicacoes.length === 0) {
        tabelaHTML += '<tr><td colspan="6">Nenhuma publicação cadastrada.</td></tr>';
    } else {
        publicacoes.forEach(pub => {
            tabelaHTML += `
                <tr>
                    <td>${pub.titulo || ''}</td>
                    <td>${pub.tipo || ''}</td>
                    <td>${pub.status || ''}</td>
                    <td>${pub.local || ''}</td>
                    <td>${formatDataBR(parseDataISO(pub.dataSubmissao)) || ''}</td>
                    <td>${formatDataBR(parseDataISO(pub.dataFinal)) || ''}</td>
                </tr>
            `;
        });
    }
    
    tabelaHTML += `
            </tbody>
        </table>
        <div class="bloco-calculo">
            <h4>Resumo do Cálculo</h4>
            ${kpi?.memoriaDeCalculo || 'Cálculo não disponível.'}
        </div>
    `;
    return tabelaHTML;
}

/**
 * (Req 4) Gera o HTML para o modal de TOLERÂNCIA
 */
function renderModalTolerancia(episodio) {
    const kpi = episodio.kpis?.tolerancia;
    // Lógica para lidar com os dois formatos (número ou objeto)
    let valor = 0;
    let memoria = "Análise não disponível.";
    
    if (typeof kpi === 'object' && kpi !== null) {
        valor = kpi.valor || 0;
        memoria = kpi.memoriaDeCalculo || "Análise não disponível.";
    } else if (typeof kpi === 'number') {
        valor = kpi;
        memoria = `A tolerância para este episódio foi definida em ${(valor * 100).toFixed(0)}%. (Formato antigo)`;
    }

    let html = `
        <div class="meta-destaque">Tolerância Definida: ${(valor * 100).toFixed(0)}%</div>
        <div class="bloco-calculo">
            <h4>Análise de Equilíbrio do Cubo</h4>
            ${memoria}
        </div>
    `;
    return html;
}


/**
 * (Req 2) Gera o HTML para o modal de PRAZO (Com Gantt)
 */
function renderModalPrazo(episodio) {
    const kpi = episodio.kpis?.prazo;
    const meta = episodio.kpis?.metaPrazo || 0;
    const entregas = kpi?.entregas || [];
    const dataEpisodio = episodio.date; // Data de "hoje"
    
    let html = `<div class="meta-destaque">Meta de Progresso: ${meta}%</div>`;
    
    if (entregas.length === 0) {
        html += '<p>Nenhum cronograma cadastrado.</p>';
    } else {
        html += renderGantt(entregas, dataEpisodio);
    }
    
    html += `
        <div class="bloco-calculo">
            <h4>Resumo do Cálculo de Progresso</h4>
            ${kpi?.memoriaDeCalculo || 'Cálculo não disponível.'}
        </div>
    `;
    return html;
}

/**
 * (Req 2.1) Lógica de renderização do Gráfico de Gantt
 */
function renderGantt(entregas, dataEpisodioStr) {
    const hoje = parseDataISO(dataEpisodioStr);
    let minDate = null;
    let maxDate = null;
    
    const tarefas = []; // Array para armazenar dados processados

    // 1. Processa todas as tarefas para encontrar datas de início, fim e o intervalo do projeto
    entregas.forEach(entrega => {
        // Ignora linhas de resumo (sem ".")
        if (!String(entrega.id || '').includes('.')) {
            return;
        }

        const dataInicio = obterDataInicio(entrega, entregas);
        let dataFim = null;
        let situacao = "Aguardando";
        
        if (dataInicio) {
            const duracao = entrega.duracao > 0 ? (entrega.duracao - 1) : 0;
            dataFim = new Date(dataInicio.getTime());
            adicionarDias(dataFim, duracao);

            // Atualiza min/max do projeto
            if (!minDate || dataInicio.getTime() < minDate.getTime()) minDate = new Date(dataInicio.getTime());
            if (!maxDate || dataFim.getTime() > maxDate.getTime()) maxDate = new Date(dataFim.getTime());
            
            // Calcula situação
            if (entrega.conclusaoReal) {
                situacao = "Concluido";
            } else if (dataFim.getTime() < hoje.getTime()) {
                situacao = "Atrasado";
            } else if (dataInicio.getTime() <= hoje.getTime()) {
                situacao = "Andamento";
            }
        }
        
        tarefas.push({
            id: entrega.id,
            nome: entrega.tarefa,
            inicio: dataInicio,
            fim: dataFim,
            situacao: situacao,
            tooltip: `${entrega.tarefa} [${entrega.id}]\nInício: ${formatDataBR(dataInicio)}\nFim: ${formatDataBR(dataFim) || 'N/A'}`
        });
    });

    if (!minDate || !maxDate) {
        return '<div class="gantt-container"><p>Não foi possível calcular o cronograma (verifique as datas de início e dependências).</p></div>';
    }

    // Adiciona uma "gordura" de 1 dia no fim para a barra não colar na borda
    adicionarDias(maxDate, 1); 

    const diffTempoTotal = maxDate.getTime() - minDate.getTime();
    const diasTotaisProjeto = (diffTempoTotal / MS_POR_DIA);

    let ganttHTML = `<div class="gantt-container">`;

    // 2. Renderiza as barras
    tarefas.forEach(tarefa => {
        if (!tarefa.inicio || !tarefa.fim) return; // Não renderiza tarefas sem data

        const diffInicio = tarefa.inicio.getTime() - minDate.getTime();
        const diasOffset = (diffInicio / MS_POR_DIA);
        
        const diffDuracao = tarefa.fim.getTime() - tarefa.inicio.getTime();
        const diasDuracao = (diffDuracao / MS_POR_DIA) + 1; // +1 para incluir o dia de início
        
        const leftPercent = (diasOffset / diasTotaisProjeto) * 100;
        const widthPercent = (diasDuracao / diasTotaisProjeto) * 100;

        let statusClass = 'status-aguardando'; // Classe padrão (azul)
        if (tarefa.situacao === 'Concluido') statusClass = 'status-concluido';
        if (tarefa.situacao === 'Atrasado') statusClass = 'status-atrasado';
        if (tarefa.situacao === 'Andamento') statusClass = 'status-andamento';

        ganttHTML += `
            <div class="gantt-tarefa">
                <div class="gantt-rotulo" title="${tarefa.nome} [${tarefa.id}]">${tarefa.nome} [${tarefa.id}]</div>
                <div class="gantt-linha-tempo">
                    <div class="gantt-barra ${statusClass}" 
                         style="left: ${Math.max(0, leftPercent.toFixed(2))}%; width: ${Math.max(0.5, widthPercent.toFixed(2))}%;"
                         data-tooltip="${tarefa.tooltip}">
                    </div>
                </div>
            </div>
        `;
    });
    
    ganttHTML += `</div>`;
    return ganttHTML;
}
