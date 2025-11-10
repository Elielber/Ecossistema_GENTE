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
            autoPlayInterval = setInterval(nextSlide, 15000); // Passa a cada 10 segundos
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
		setupTimelineToggle();
        
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
			// (Recolhe a timeline após o clique, SE estiver em mobile)
            const mediaQuery = window.matchMedia('(max-width: 1000px)');
            if (mediaQuery.matches) {
                const container = document.getElementById('timeline-container');
                const btn = document.getElementById('timeline-toggle-btn');
                if (container && btn) {
                    container.classList.add('timeline-collapsed');
                    btn.innerText = '▼'; // Garante que o botão mostre "para baixo"
                }
            }
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
    const novoTituloEpisodio = `Episódio (${episodio.id || 'N/A'}): ${episodio.title || 'Sem Título'}`;
    setContent('painel-summary-label', novoTituloEpisodio);
    setContent('painel-summary-content', episodio.summary);

    // Componentes
    setContent('problema-content', episodio.components?.problema);
    setContent('hipoteses-content', episodio.components?.hipoteses);
    setContent('referencial-content', episodio.components?.referencial);
    setContent('metodologia-content', episodio.components?.metodologia);
    setContent('impacto-content', episodio.components?.impacto);
    setContent('produto-content', episodio.components?.produto);

    // --- Resumos dos KPIs (Agora usa as funções getKpi...Valor) ---
    
    // Viabilidade (V%)
    const vPercent = getKpiViabilidadeValor(episodio);
    setContent('kpi-viabilidade-resumo', vPercent.toFixed(1) + '%');

    // Prazo (T%)
    const tPercent = getKpiPrazoValor(episodio);
    setContent('kpi-prazo-resumo', tPercent.toFixed(1) + '%');

    // Publicidade (P%)
    const pPercent = getKpiPublicidadeValor(episodio);
    setContent('kpi-publicidade-resumo', pPercent.toFixed(1) + '%');
    
    // Tolerância (Diagnóstico de Viés)
    const prefixoInclinacao = getInclinacaoCubo(episodio);
    let textoTolerancia = 'Equilibrado'; 
    switch (prefixoInclinacao) {
        case 'V': textoTolerancia = 'Viés: Paralisia por Análise'; break;
        case 'T': textoTolerancia = 'Viés: Executor Apressado'; break;
        case 'P': textoTolerancia = 'Viés: Acadêmico Teórico'; break;
        case 'E':
        default:
            const toleranciaKPI = episodio.kpis.tolerancia;
            if (typeof toleranciaKPI === 'object' && toleranciaKPI !== null && toleranciaKPI.resumo) {
                textoTolerancia = toleranciaKPI.resumo;
            } else {
                textoTolerancia = 'Equilibrado';
            }
            break;
    }
    setContent('kpi-tolerancia-resumo', textoTolerancia);
    
    // Imagem do Cubo
    atualizarPainelCubo(episodio);
	
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

// --- INÍCIO DAS NOVAS FUNÇÕES HELPER DE CÁLCULO ---

/**
 * Calcula o KPI percentual de Viabilidade (Custo)
 * @param {object} episodio - O objeto do episódio atual
 * @returns {string} - O KPI formatado (ex: "100%") ou "N/A"
 */
/**
 * Calcula o KPI percentual de Viabilidade (V%)
 * USA A NOVA LÓGICA IVId (Índice de Viabilidade Dinâmico)
 */
function getKpiViabilidadeValor(episodio) {
    // 1. Obter as Estimativas Estratégicas
    const est = episodio.viabilidade_estimativas || { B5_impacto: 0, B6_produto: 0, C1_problema: 0, CV_solucao: 0 };
    const B5 = est.B5_impacto || 0;     // Benefício (Impacto Face 5)
    const B6 = est.B6_produto || 0;    // Benefício (Produto Face 6)
    const C1 = est.C1_problema || 0;   // Custo (Problema Face 1)
    const CV = est.CV_solucao || 0;  // Custo (Solução Eixo V)

    // 2. Obter a Maturidade (M) do Progresso das Fases (Eixo T)
    const prog = episodio.kpis?.prazo?.progresso_fases || { fase1: 0, fase2: 0, fase3: 0, fase4: 0, fase5: 0 };
    const M1 = prog.fase1 || 0;  // Maturidade do Custo do Problema (Fase 1)
    const MV = prog.fase2 || 0;  // Maturidade do Custo da Solução (Fase 2)
    const M6 = prog.fase3 || 0;  // Maturidade do Benefício do Produto (Fase 3)
    
    // Maturidade do Benefício de Impacto (Média Fases 4 e 5)
    const M5 = ((prog.fase4 || 0) + (prog.fase5 || 0)) / 2;

    // 3. Calcular os Termos Ponderados
    const beneficioPonderado = (B5 * M5) + (B6 * M6);
    const custoPonderado = (C1 * M1) + (CV * MV);

    // 4. Calcular o IVId e retornar o V(%)
    let eixoV_percent = 0;

    if (custoPonderado > 0) {
        // IVId (Ratio) = Benefício Ponderado / Custo Ponderado
        const ivid_ratio = beneficioPonderado / custoPonderado;
        // Converte a razão para percentual
        eixoV_percent = ivid_ratio * 100;
    } else if (beneficioPonderado > 0) {
        eixoV_percent = 999; // Valor alto para indicar benefício sem custo
    }
    
    return eixoV_percent;
}

/** Calcula o KPI percentual de Publicidade */
function getKpiPublicidadeValor(episodio) {
    const kpis = episodio.kpis;
    const meta = kpis?.metaPublicacao || 0;
    const apuracao = kpis?.publicidade?.valor || 0; 
    if (meta > 0) return (apuracao / meta) * 100;
    if (apuracao === 0) return 100.0;
    return 0.0; 
}

/** Calcula o KPI percentual de Prazo */
function getKpiPrazoValor(episodio) {
    const kpis = episodio.kpis;
    const meta = kpis?.metaPrazo || 0;
    const apuracao = kpis?.prazo?.valor || 0; 
    if (meta > 0) return (apuracao / meta) * 100;
    if (apuracao === 0) return 100.0;
    return 0.0;
}
/**
 * Calcula o prefixo de inclinação do Cubo (E, V, T, P)
 * @param {object} episodio - O objeto do episódio atual
 * @returns {string} - 'E', 'V', 'T', or 'P'
 */
function getInclinacaoCubo(episodio) {
    const kpis = episodio.kpis;
    if (!kpis) return 'E';

    // 1. Get Tolerancia
    const toleranciaObj = kpis.tolerancia;
    let toleranciaPercent = 0;
    if (typeof toleranciaObj === 'object' && toleranciaObj !== null) {
        toleranciaPercent = (toleranciaObj.valor || 0) * 100;
    } else if (typeof toleranciaObj === 'number') {
        toleranciaPercent = toleranciaObj * 100;
    }
    // Fallback para evitar divisão por zero ou range 0
    if (toleranciaPercent === 0) toleranciaPercent = 10; 

    // 2. Calcula os 3 KPIs (%)
    const kpiPrazo = getKpiPrazoValor(episodio);
    const kpiPub = getKpiPublicidadeValor(episodio);
    const kpiVib = getKpiViabilidadeValor(episodio);

    // 3. Calcula o Range
    const kpiArray = [kpiPrazo, kpiPub, kpiVib];
    const kpiMax = Math.max(...kpiArray);
    const kpiMin = Math.min(...kpiArray);
    const kpiRange = kpiMax - kpiMin;

    let prefixoInclinacao = 'E'; // Padrão

    // 4. Verifica o desequilíbrio
    if (kpiRange > toleranciaPercent) {
        const kpiMedia = (kpiPrazo + kpiPub + kpiVib) / 3;
        const desviosAcimaMedia = [
            { kpi: 'T', desvio: kpiPrazo - kpiMedia }, // Prazo
            { kpi: 'P', desvio: kpiPub - kpiMedia },  // Publicidade
            { kpi: 'V', desvio: kpiVib - kpiMedia }   // Viabilidade
        ];
        const positivos = desviosAcimaMedia.filter(d => d.desvio > 0);
        if (positivos.length > 0) {
            positivos.sort((a, b) => b.desvio - a.desvio);
            prefixoInclinacao = positivos[0].kpi;
        }
    }
    return prefixoInclinacao;
}
/**
 * Atualiza a imagem do cubo E exibe o texto de alerta de desequilíbrio.
 */
function atualizarPainelCubo(episodio) {
    const kpis = episodio.kpis;
    const cuboImg = document.getElementById('cubo-pesquisa-img');
    
    if (!kpis || !cuboImg) return;

    // 1. LÊ o nome do arquivo que o editor JÁ CALCULOU e SALVOU
    // O editor salvou 'cubo-T75-cinza.png' no dados.json [cite: 91]
    const nomeArquivo = kpis.cuboImagem || 'cubo-E1-azul.png'; // Ex: "cubo-T75-cinza.png"

    // 2. Aplica a imagem
    cuboImg.src = nomeArquivo; 
    
    // 3. Lógica de Fallback (Corrigida para PNG)
    cuboImg.onerror = () => { 
        // Extrai a base, ex: "cubo-T75"
        const nomeBase = nomeArquivo.substring(0, nomeArquivo.lastIndexOf('-')) || "cubo-E0";
        
        // Fallback 1: Tenta a versão "azul" (padrão)
        const fallbackCor = `${nomeBase}-azul.png`; // Tenta o azul (se o cinza falhar)
        
        if (cuboImg.src.endsWith(fallbackCor)) { // Se o azul já falhou...
            cuboImg.onerror = () => {
                 // Fallback 2: Tenta a imagem PNG original (sem cor)
                 const fallbackPng = nomeBase + ".png";
                 cuboImg.src = fallbackPng;
                 kpis.cuboImagem = fallbackPng;
                 cuboImg.onerror = () => {
                    // Fallback 3: Tenta o PNG padrão de equilíbrio
                    const fallbackFinal = 'cubo-E0.png';
                    cuboImg.src = fallbackFinal; 
                    kpis.cuboImagem = fallbackFinal;
                    cuboImg.onerror = null; 
                 }
            }
        } else {
             // Tenta o azul primeiro
             cuboImg.src = fallbackCor;
             kpis.cuboImagem = fallbackCor; // Atualiza em memória (não salva)
             cuboImg.onerror = () => { // Se o azul falhar...
                 const fallbackPng = nomeBase + ".png";
                 cuboImg.src = fallbackPng;
                 kpis.cuboImagem = fallbackPng;
                 cuboImg.onerror = () => {
                    const fallbackFinal = 'cubo-E0.png';
                    cuboImg.src = fallbackFinal; 
                    kpis.cuboImagem = fallbackFinal;
                    cuboImg.onerror = null; 
                 }
             }
        }
    };
}
/**
 * Configura o botão de recolher/expandir a timeline em modo mobile.
 */
function setupTimelineToggle() {
    const container = document.getElementById('timeline-container');
    const btn = document.getElementById('timeline-toggle-btn');
    
    if (!container || !btn) return;

    const mediaQuery = window.matchMedia('(max-width: 1000px)');

    // Função para definir o estado inicial
    const setInitialState = () => {
        if (mediaQuery.matches) {
           // Em mobile, começa recolhido
            container.classList.add('timeline-collapsed');
            btn.innerText = '▼'; // Mostra "para baixo" (expandir)
        } else {
            // Em desktop, começa expandido
            container.classList.remove('timeline-collapsed');
            btn.innerText = '▲'; // Mostra "para cima" (recolher)
        }
    };

    // Define o estado ao carregar a página
    setInitialState();

    // Adiciona o clique no botão
    btn.onclick = () => {
        const isCollapsed = container.classList.toggle('timeline-collapsed');
        // Atualiza o texto do botão
        btn.innerText = isCollapsed ? '▼' : '▲';
    };

    // Ouve mudanças no tamanho da tela (ex: virar o celular)
    mediaQuery.addEventListener('change', setInitialState);
}

// --- FIM DAS NOVAS FUNÇÕES HELPER DE CÁLCULO ---

/**
 * (Req 1) Gera o HTML para o modal de VIABILIDADE
 */
// SUBSTITUA a função 'renderModalViabilidade' (linhas 556-628) por esta:
/**
 * Gera o HTML para o modal de VIABILIDADE (V%)
 * Agora mostra o cálculo ESTRATÉGICO (IVId)
 */
function renderModalViabilidade(episodio) {
    // 1. Obter as Estimativas Estratégicas
    const est = episodio.viabilidade_estimativas || { B5_impacto: 0, B6_produto: 0, C1_problema: 0, CV_solucao: 0 };
    const B5 = est.B5_impacto || 0;
    const B6 = est.B6_produto || 0;
    const C1 = est.C1_problema || 0;
    const CV = est.CV_solucao || 0;

    // 2. Obter a Maturidade (M) do Progresso das Fases (Eixo T)
    const prog = episodio.kpis?.prazo?.progresso_fases || { fase1: 0, fase2: 0, fase3: 0, fase4: 0, fase5: 0 };
    const M1 = (prog.fase1 || 0) * 100; // Converte 0.8 para 80%
    const MV = (prog.fase2 || 0) * 100;
    const M6 = (prog.fase3 || 0) * 100;
    const M5 = (((prog.fase4 || 0) + (prog.fase5 || 0)) / 2) * 100;

    // 3. Calcular os Termos Ponderados
    const beneficioPonderado = (B5 * (M5/100)) + (B6 * (M6/100));
    const custoPonderado = (C1 * (M1/100)) + (CV * (MV/100));

    // 4. Calcular o IVId e o V(%)
    let eixoV_percent = 0;
    let ivid_ratio = 0;
    if (custoPonderado > 0) {
        ivid_ratio = beneficioPonderado / custoPonderado;
        eixoV_percent = ivid_ratio * 100;
    } else if (beneficioPonderado > 0) {
        eixoV_percent = 999; 
    }

    // 5. Montar o HTML
    let html = `
        <div class="meta-destaque">
            Índice de Viabilidade (V%): <strong>${eixoV_percent.toFixed(1)}%</strong>
        </div>
        
        <p style="font-size: 0.9em; text-align: center; color: #555;">
            O Eixo V é um KPI estratégico que compara Benefícios Ponderados vs. Custos Ponderados.<br>
            Um valor > 100% indica que os benefícios superam os custos, na maturidade atual.
        </p>

        <table>
            <thead>
                <tr>
                    <th>Componente</th>
                    <th>Valor Estimado (R$)</th>
                    <th>Maturidade (M%)</th>
                    <th>Valor Ponderado (R$)</th>
                </tr>
            </thead>
            <tbody>
                <tr style="background-color: #f0fdf4;">
                    <td>(B5) Benefício - Impacto (Face 5)</td>
                    <td>R$ ${B5.toFixed(2)}</td>
                    <td>${M5.toFixed(1)}%</td>
                    <td>R$ ${(B5 * (M5/100)).toFixed(2)}</td>
                </tr>
                <tr style="background-color: #f0fdf4; font-weight: bold;">
                    <td>(B6) Benefício - Produto (Face 6)</td>
                    <td>R$ ${B6.toFixed(2)}</td>
                    <td>${M6.toFixed(1)}%</td>
                    <td>R$ ${(B6 * (M6/100)).toFixed(2)}</td>
                </tr>
                <tr style="font-weight: bold; background-color: #dcfce7;">
                    <td colspan="3" style="text-align: right;">Total Benefício Ponderado:</td>
                    <td>R$ ${beneficioPonderado.toFixed(2)}</td>
                </tr>

                <tr style="background-color: #fef2f2;">
                    <td>(C1) Custo - Problema (Face 1)</td>
                    <td>R$ ${C1.toFixed(2)}</td>
                    <td>${M1.toFixed(1)}%</td>
                    <td>R$ ${(C1 * (M1/100)).toFixed(2)}</td>
                </tr>
                <tr style="background-color: #fef2f2; font-weight: bold;">
                    <td>(CV) Custo - Solução (Eixo V)</td>
                    <td>R$ ${CV.toFixed(2)}</td>
                    <td>${MV.toFixed(1)}%</td>
                    <td>R$ ${(CV * (MV/100)).toFixed(2)}</td>
                </tr>
                <tr style="font-weight: bold; background-color: #fee2e2;">
                    <td colspan="3" style="text-align: right;">Total Custo Ponderado:</td>
                    <td>R$ ${custoPonderado.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        <div class="bloco-calculo">
            <h4>Memória de Cálculo (IVId)</h4>
            1. Benefício Ponderado = (B5 * M5) + (B6 * M6)
               = (R$ ${B5.toFixed(2)} * ${M5.toFixed(1)}%) + (R$ ${B6.toFixed(2)} * ${M6.toFixed(1)}%)
               = R$ ${beneficioPonderado.toFixed(2)}
            <br>
            2. Custo Ponderado = (C1 * M1) + (CV * MV)
               = (R$ ${C1.toFixed(2)} * ${M1.toFixed(1)}%) + (R$ ${CV.toFixed(2)} * ${MV.toFixed(1)}%)
               = R$ ${custoPonderado.toFixed(2)}
            <br>
            3. IVId (Ratio) = Benefício Ponderado / Custo Ponderado
               = R$ ${beneficioPonderado.toFixed(2)} / R$ ${custoPonderado.toFixed(2)}
               = ${ivid_ratio.toFixed(3)}
            <br>
            4. V% (KPI) = IVId * 100
               = <strong>${eixoV_percent.toFixed(1)}%</strong>
        </div>
    `;
    
    // Adiciona o modal tático (que estava antes)
    const kpi_tatico = episodio.kpis?.viabilidade;
    const itens_taticos = kpi_tatico?.itens || [];
    if (itens_taticos.length > 0) {
         html += `
            <h4 style="margin-top: 25px; border-top: 1px solid #ccc; padding-top: 15px;">
                Controle Orçamentário (Tático)
            </h4>
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
         itens_taticos.forEach(item => {
            html += `
                <tr>
                    <td>${item.item || ''}</td>
                    <td>${item.tipo || ''}</td>
                    <td>${formatDataBR(parseDataISO(item.data)) || ''}</td>
                    <td>R$ ${(item.valor || 0).toFixed(2)}</td>
                </tr>
            `;
         });
         html += `
                </tbody>
            </table>
            <div class="bloco-calculo">
                <h4>Resumo do Cálculo (Tático)</h4>
                ${kpi_tatico?.memoriaDeCalculo || 'Cálculo não disponível.'}
            </div>
         `;
    }

    return html;
}

/**
 * (Req 3) Gera o HTML para o modal de PUBLICIDADE
 */
/**
 * (Req 3) Gera o HTML para o modal de PUBLICIDADE
 */
function renderModalPublicidade(episodio) {
    const kpi = episodio.kpis?.publicidade;
    const meta = episodio.kpis?.metaPublicacao || 0;
    
    // 1. Pega a lista de publicações do episódio atual.
    const publicacoes = kpi?.publicacoes || [];

    // 2. Calcula a Apuração
    const apuracao = publicacoes.filter(p => 
        p.status === 'Aceito' || p.status === 'Publicado'
    ).length;

    // 3. Calcula o KPI (com o ajuste para toFixed(1))
    let kpiResultadoString = 'N/A';
    if (meta > 0) {
        const kpiValor = (apuracao / meta) * 100;
        kpiResultadoString = `${kpiValor.toFixed(1)}%`; // Ajustado
    } else {
        if (apuracao === 0) {
            kpiResultadoString = '100%'; 
        } else {
            kpiResultadoString = 'N/A (Meta 0)';
        }
    }

    // --- MONTAGEM DO HTML (Parte 1: Tabela) ---
    let tabelaHTML = `
        <div class="meta-destaque">
             Apuração: ${apuracao} / Meta: ${meta} = <strong>${kpiResultadoString}</strong>
        </div>
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

    // --- INÍCIO DA ADIÇÃO (Parte 2: Detalhes) ---
    
    let detalhesHTML = `
        <div class="bloco-detalhes-pub">
            <h4>Detalhes das Publicações</h4>
    `;

    if (publicacoes.length === 0) {
        detalhesHTML += '<p>Nenhuma publicação para detalhar.</p>';
    } else {
        publicacoes.forEach(pub => {
            detalhesHTML += `
                <article class="pub-detalhe">
                    <strong>${pub.titulo || 'Artigo sem título'}</strong>
            `;
            
            // 2. Autores (Aparecerá quando existir no JSON)
            if (pub.autores) {
                detalhesHTML += `<p class="pub-autores"><strong>Autores:</strong> ${pub.autores}</p>`;
            }
            
            // 3. Resumo (Aparecerá quando existir no JSON)
            if (pub.resumo) {
                detalhesHTML += `<p class="pub-resumo">${pub.resumo}</p>`;
            }
            
            detalhesHTML += `</article>`;
        });
    }
    
    detalhesHTML += `</div>`;
    // --- FIM DA ADIÇÃO ---

    // Retorna a Tabela + o Bloco de Cálculo + o Bloco de Detalhes
    return tabelaHTML + detalhesHTML;
}
/**
 * (Req 4) Gera o HTML para o modal de TOLERÂNCIA (com diagnóstico de viés)
 */
/**
 * (Req 4) Gera o HTML para o modal de TOLERÂNCIA 
 * Esta versão lê a memória de cálculo moderna e exibe o diagnóstico de viés.
 */
function renderModalTolerancia(episodio) {
    const kpi = episodio.kpis?.tolerancia;
    
    // 1. Get Tolerancia Valor e Memoria (Lógica simplificada)
    let metaLabel = 'N/D';
    let memoria = "Análise não disponível.";
    let kpiResumo = '--';

    if (typeof kpi === 'object' && kpi !== null) {
        metaLabel = `${(kpi.valor || 0) * 100}%`;
        memoria = kpi.memoriaDeCalculo || "Análise não disponível.";
        kpiResumo = kpi.resumo || '--';
    } else if (typeof kpi === 'number') { // Fallback para formato antigo
        metaLabel = `${kpi * 100}%`;
        kpiResumo = `${metaLabel} (Definida)`;
        memoria = `A tolerância para este episódio foi definida em ${metaLabel}.`;
    }

    // 2. Diagnóstico de Viés
    const prefixoInclinacao = getInclinacaoCubo(episodio); // Esta função já está correta
    let textoAlertaHTML = ""; // Começa vazio
    
    switch (prefixoInclinacao) {
        case 'V':
            textoAlertaHTML = `
                <div class="bloco-alerta-viés">
                    <strong>Diagnóstico (Alerta "V"): O Viés da "Paralisia por Análise"</strong>
                    <p>O Pilar Dominante "Viabilidade" (recursos) está saudável, mas o projeto não avança na execução (Prazo e Publicidade fracos).</p>
                    <p><strong>Interpretação:</strong> O pesquisador, evitando tarefas de execução (Metodologia), tende a alocar esforço em atividades "seguras":</p>
                    <ul>
                        <li><strong>Favorece:</strong> "Referencial Teórico" (Face 3), em um ciclo de refinamento infinito; e "Impacto na Sociedade" (Face 5), teorizando sobre a relevância sem construir a solução.</li>
                        <li><strong>Negligencia:</strong> "Hipóteses de Solução" (Face 2) e "Produto da Pesquisa" (Face 6), que exigem a execução prática.</li>
                    </ul>
                </div>`;
            break;
        case 'T':
            textoAlertaHTML = `
                <div class="bloco-alerta-viés">
                    <strong>Diagnóstico (Alerta "T"): O Viés do "Executor Apressado"</strong>
                    <p>O Pilar Dominante "Prazo" (progresso) está forte, mas o Custo pode estar estourado ou a Qualidade da Publicação baixa.</p>
                    <p><strong>Interpretação:</strong> O pesquisador confunde "fazer" com "pesquisar". O foco obsessivo em avançar o cronograma leva à negligência do rigor científico e do controle de recursos.</p>
                    <ul>
                        <li><strong>Favorece:</strong> "Produto da Pesquisa" (Face 6), pois é a entrega tangível; e "Impacto na Sociedade" (Face 5), usado como justificativa para a pressa.</li>
                        <li><strong>Negligencia:</strong> "Referencial Teórico" (Face 3), visto como "perda de tempo"; e "Hipóteses" (Face 2), que são implementadas sem validação rigorosa.</li>
                    </ul>
                </div>`;
            break;
        case 'P':
            textoAlertaHTML = `
                <div class="bloco-alerta-viés">
                    <strong>Diagnóstico (Alerta "P"): O Viés do "Acadêmico Teórico"</strong>
                    <p>O Pilar Dominante "Publicação" (artigos) está forte, mas o Custo e o Prazo do projeto principal (tese/protótipo) estão comprometidos.</p>
                    <p><strong>Interpretação:</strong> O pilar 'Publicação' é alimentado por "spin-offs" teóricos, e não pela execução do projeto central.</p>
                    <ul>
                        <li><strong>Favorece:</strong> "Referencial Teórico" (Face 3), resultando em revisões publicáveis; e "Hipóteses" (Face 2), gerando ensaios teóricos não testados.</li>
                        <li><strong>Negligencia:</strong> "Produto da Pesquisa" (Face 6), que é o objetivo central e está atrasado; e "Impacto na Sociedade" (Face 5), pois o diálogo foca apenas nos pares acadêmicos.</li>
                    </ul>
                </div>`;
            break;
    }

    // 3. Monta o HTML final (sem a lógica de parsing que causava o erro)
    let html = `
        <div class="meta-destaque">
            Resultado: <strong>${kpiResumo}</strong> (Limite: ${metaLabel})
        </div>
        
        ${textoAlertaHTML} 

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
// SUBSTITUA a função 'renderModalPrazo' (linhas 860-911) por esta:
/**
 * (Req 2) Gera o HTML para o modal de PRAZO (Com Gantt)
 */
function renderModalPrazo(episodio) {
    const kpi = episodio.kpis?.prazo;
    const meta = episodio.kpis?.metaPrazo || 0; // Ex: 35
    const entregas = kpi?.entregas || [];
    const dataEpisodio = episodio.date; // Data de "hoje"
    
    // --- LÓGICA DE CÁLCULO ATUALIZADA ---
    const apuracaoValor = kpi?.valor || 0; // Ex: 33.96
    const apuracaoString = `${apuracaoValor.toFixed(1)}%`; // Ex: "34.0%"
    
    let kpiResultadoString = 'N/A';
    if (meta > 0) {
        const kpiValor = (apuracaoValor / meta) * 100; // Ex: (33.96 / 35) * 100 = 97.0
        kpiResultadoString = `${kpiValor.toFixed(1)}%`;
    } else if (apuracaoValor === 0) {
        kpiResultadoString = '100%';
    }
    // --- FIM DA LÓGICA ATUALIZADA ---
    
    let html = `
        <div class="meta-destaque">
            Apuração: ${apuracaoString} / Meta: ${meta}% = <strong>${kpiResultadoString}</strong>
        </div>
    `;
    
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

/** (Req 2.1) Lógica de renderização do Gráfico de Gantt
 */
function renderGantt(entregas, dataEpisodioStr) {
    const hoje = parseDataISO(dataEpisodioStr);
    let minDate = null;
    let maxDate = null;
    
    const tarefas = []; // Array para armazenar dados processados

    // 1. Processa todas as tarefas...
    entregas.forEach(entrega => {
        
        // --- INÍCIO DA MODIFICAÇÃO (Detectar Fases) ---
        // Se NÃO tiver ponto no ID (ex: "1", "2"), é um título de fase.
        if (!String(entrega.id || '').includes('.')) {
            tarefas.push({
                id: entrega.id,
                nome: entrega.tarefa,
                inicio: null,
                fim: null,
                situacao: "Fase",
                tooltip: `${entrega.tarefa} [${entrega.id}]`,
                tipo: 'fase' // Novo campo para identificar o tipo
            });
            return; // Pula para a próxima entrega
        }
        // --- FIM DA MODIFICAÇÃO ---

        // Se chegou aqui, é uma TAREFA (lógica antiga)
        const dataInicio = obterDataInicio(entrega, entregas);
        let dataFim = null;
        let situacao = "Aguardando";
        if (dataInicio) {
            const duracao = entrega.duracao > 0 ? (entrega.duracao - 1) : 0;
            dataFim = new Date(dataInicio.getTime());
            adicionarDias(dataFim, duracao);
            if (!minDate || dataInicio.getTime() < minDate.getTime()) minDate = new Date(dataInicio.getTime());
            if (!maxDate || dataFim.getTime() > maxDate.getTime()) maxDate = new Date(dataFim.getTime());
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
            tooltip: `${entrega.tarefa} [${entrega.id}]\nInício: ${formatDataBR(dataInicio)}\nFim: ${formatDataBR(dataFim) || 'N/A'}`,
            tipo: 'tarefa' // Novo campo para identificar o tipo
        });
    });

    if (!minDate || !maxDate) {
        return '<div class="gantt-container"><p>Não foi possível calcular o cronograma (verifique as datas de início e dependências).</p></div>';
    }

    adicionarDias(maxDate, 1);

    const diffTempoTotal = maxDate.getTime() - minDate.getTime();
    const diasTotaisProjeto = (diffTempoTotal / MS_POR_DIA);

    let ganttHTML = `<div class="gantt-container">`;

    // --- INÍCIO DA LINHA DO TEMPO "HOJE" ---
    let hojeLinhaHTML = '';
    if (hoje && hoje.getTime() >= minDate.getTime() && hoje.getTime() < maxDate.getTime()) {
        const diffHoje = hoje.getTime() - minDate.getTime();
        const diasOffsetHoje = (diffHoje / MS_POR_DIA);
        
        const espacoRotulo = 30; // 30% do CSS
        const espacoGrafico = 70; // 70% do CSS
        
        const leftPercentHoje_raw = (diasOffsetHoje / diasTotaisProjeto) * 100;
        const leftPercentHoje = espacoRotulo + (espacoGrafico * (leftPercentHoje_raw / 100));

        hojeLinhaHTML = `
            <div class="gantt-hoje-linha" style="left: ${leftPercentHoje.toFixed(2)}%;">
                <span class="gantt-hoje-rotulo">${formatDataBR(hoje)}</span>
            </div>
        `;
    }
    ganttHTML += hojeLinhaHTML;
    // --- FIM DA LINHA DO TEMPO "HOJE" ---


    // 2. Renderiza as barras
    tarefas.forEach(tarefa => {
        
        // --- INÍCIO DA MODIFICAÇÃO (Renderizar Fases) ---
        if (tarefa.tipo === 'fase') {
            ganttHTML += `
                <div class="gantt-fase" title="${tarefa.tooltip}">
                    ${tarefa.nome} [${tarefa.id}]
                </div>
            `;
            return; // Pula para a próxima tarefa
        }
        // --- FIM DA MODIFICAÇÃO ---

        // Se chegou aqui, é uma TAREFA (lógica antiga)
        if (!tarefa.inicio || !tarefa.fim) return; // Ignora tarefas sem data

        const diffInicio = tarefa.inicio.getTime() - minDate.getTime();
        const diasOffset = (diffInicio / MS_POR_DIA);
        
        const diffDuracao = tarefa.fim.getTime() - tarefa.inicio.getTime();
        const diasDuracao = (diffDuracao / MS_POR_DIA) + 1;
        
        const leftPercent = (diasOffset / diasTotaisProjeto) * 100;
        const widthPercent = (diasDuracao / diasTotaisProjeto) * 100;

        let statusClass = 'status-aguardando';
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
