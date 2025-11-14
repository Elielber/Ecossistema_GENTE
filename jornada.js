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


// --- 2. LÓGICA PRINCIPAL DA APLICAÇÃO (JORNADA) ---

let dadosPesquisa = null; // Cache dos dados carregados
const MS_POR_DIA = 1000 * 60 * 60 * 24;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DA PÁGINA JORNADA ---
    if (document.body.contains(document.getElementById('timeline'))) {
        inicializarJornada();
    }
}); // <-- FIM DO 'DOMContentLoaded'


// --- 3. LÓGICA DA PÁGINA JORNADA (NOVA) ---

async function inicializarJornada() {
    setupModalListeners(); // Configura os botões do modal (fechar, etc.)
	const legendaBtn = document.getElementById('cubo-legenda-btn');
    if (legendaBtn) {
        legendaBtn.onclick = (e) => {
            e.preventDefault(); // Impede o link de pular a página
            const modalText = document.getElementById('modal-text');
            
            // Rejeita o clique no painel pai
            e.stopPropagation(); 
            
            // Renderiza o conteúdo da legenda
            modalText.innerHTML = renderModalLegenda();
            
            // Abre o modal
            abrirModal();
        };
    }
	const driveBtn = document.getElementById('drive-link-btn');
if (driveBtn) {
    driveBtn.onclick = (e) => {
        e.preventDefault();
        const modalText = document.getElementById('modal-text');
        e.stopPropagation();

        // Chama a nova função que você criou
        modalText.innerHTML = renderModalDrive(); 

        abrirModal();
    };
}
    try {
        const response = await fetch('dados.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        dadosPesquisa = await response.json();
        
        if (!dadosPesquisa || !dadosPesquisa.historia) throw new Error("JSON inválido");
        
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

    setContent('label-diagnostico', `Diagnóstico da pesquisa: ${episodio.nome || 'Sem Título'}`);
    
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
    
    // Tolerância (Diagnóstico de Viés E Coerência)
    const kpis = episodio.kpis;
    let textoBias = '';
    let textoCoerencia = '';

    // 1. Define o texto do Viés (Equilíbrio)
    const prefixoInclinacao = getInclinacaoCubo(episodio);
    switch (prefixoInclinacao) {
        case 'V': textoBias = 'Pesquisa com viés "V"'; break;
        case 'T': textoBias = 'Pesquisa com viés "T"'; break;
        case 'P': textoBias = 'Pesquisa com viés "P"'; break;
        case 'E':
        default:
            textoBias = 'Pesquisa equilibrada';
            break;
    }

    // 2. Define o texto da Coerência (Cor)
    const nomeImagem = kpis.cuboImagem || '';
    if (nomeImagem.includes('-cinza')) {
        textoCoerencia = "e conteúdo incoerente"; 
    } else {
        textoCoerencia = "e conteúdo coerente";
    }

    // 3. Combina os dois textos
    const textoFinal = `${textoBias} ${textoCoerencia}`;
    setContent('kpi-tolerancia-resumo', textoFinal);
    
    
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
    const est = episodio.viabilidade_estimativas || {};
    // Lê o valor de dentro do objeto {valor, just}
    const B5 = est.B5_impacto?.valor || 0;
    const B6 = est.B6_produto?.valor || 0;
    const C1 = est.C1_problema?.valor || 0;
    const CV = est.CV_solucao?.valor || 0;

    // 2. Calcular Totais (Lógica Proativa)
    const beneficioTotal = B5 + B6;
    const custoTotal = C1 + CV;

    // 3. Calcular o IVId e retornar o V(%)
    let eixoV_percent = 0;
    if (custoTotal > 0) {
        // IVId (Ratio) = Benefício Total / Custo Total
        const ivid_ratio = beneficioTotal / custoTotal;
        // Converte a razão para percentual
        eixoV_percent = ivid_ratio * 100;
    } else if (beneficioTotal > 0) {
        // Se o custo é zero mas o benefício não é, retorna um valor alto
        eixoV_percent = 999; 
    }
    
    return eixoV_percent;
}

/** Calcula o KPI percentual de Publicidade */
function getKpiPublicidadeValor(episodio) {
    const kpis = episodio.kpis;
    const meta = kpis?.metaPublicacao || 0;
    const apuracao = kpis?.publicidade?.valor || 0; 
    
    if (meta > 0) {
        return (apuracao / meta) * 100;
    }
    // Se meta === 0:
    if (apuracao > 0) {
        return 100.0; // Fez mais que a meta (ou meta era 0)
    }
    // Se meta === 0 E apuracao === 0:
    return 0.0; // Nada esperado, nada feito = 0%
}

/** Calcula o KPI percentual de Prazo */
function getKpiPrazoValor(episodio) {
    const kpis = episodio.kpis;
    const meta = kpis?.prazo?.metaPrazo || 0; 
    const apuracao = kpis?.prazo?.valor || 0; 
    
    if (meta > 0) {
        return (apuracao / meta) * 100;
    }
    // Se meta === 0:
    if (apuracao > 0) {
        return 100.0; // Trabalho adiantado (feito sem meta)
    }
    // Se meta === 0 E apuracao === 0:
    return 0.0; // Nada esperado, nada feito = 0%
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
    // O editor salvou 'cubo-T75-cinza.png' no dados.json
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
// Gera o HTML com a legenda dos diagnósticos visuais do Cubo.

function renderModalLegenda() {
    let html = `
        <h3 style="margin-top:0;">Como Ler o Cubo da Pesquisa</h3>
        <p>O Cubo oferece três diagnósticos visuais simultâneos para avaliar a saúde da pesquisa:</p>
        
        <h4 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">1. A INCLINAÇÃO (O Viés de Gestão)</h4>
        <p>Baseado na <strong>Abordagem Apreciativa</strong>, o Cubo "inclina" na direção do KPI (Eixo) que está com <strong>desempenho dominante</strong>, alertando para um possível viés:</p>
        <ul>
            <li><strong>Alerta V (Viabilidade):</strong> "Viés da Paralisia por Análise". Muitos recursos, pouco avanço.</li>
            <li><strong>Alerta T (Prazo):</strong> "Viés do Executor Apressado". Avanço rápido, mas com risco de baixo rigor.</li>
            <li><strong>Alerta P (Publicação):</strong> "Viés do Acadêmico Teórico". Alta produção de artigos, mas o projeto central não avança.</li>
        </ul>

        <h4 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">2. A COR (O Rigor Metodológico)</h4>
        <p>A cor do Cubo avalia o alinhamento das 6 faces (Problema, Hipótese, Método, etc.), usando o <strong>Orientador Metodológico</strong>:</p>
        <ul>
            <li><strong style="color: #2980b9;">CUBO AZUL:</strong> Coerente. O seu Problema, Método e Produto estão alinhados.</li>
            <li><strong style="color: #777;">CUBO CINZA:</strong> Incoerente. Existe uma quebra lógica na sua cadeia metodológica (ex: um Problema Exploratório com um Método Experimental).</li>
        </ul>

        <h4 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">3. O VOLUME (O Progresso Físico)</h4>
        <p>O "preenchimento" visual do Cubo (de 1% a 100%) representa o <strong>Progresso Ponderado</strong> (Apurado) do seu Eixo Prazo. Ele mostra o quanto do cronograma total já foi fisicamente concluído.</p>
    `;
    return html;
}
/**
 * Gera o HTML para o modal do Drive da Pesquisa
 */
function renderModalDrive() {
    // IMPORTANTE: Substitua pela URL real do seu drive
    const urlDoDrive = "https://drive.google.com/drive/folders/1IWdcGj7xpSQn-RiLkGbrQ8h2U3xB_ZZz?usp=drive_link"; 

    let html = `
        <h3 style="margin-top:0;">Drive da Pesquisa</h3>
        
        <p>
            Este é o repositório central de todos os artefatos, dados brutos,
            planilhas de cálculo e documentos relacionados a este projeto de pesquisa.
        </p>
        <p>
            Sinta-se à vontade para explorar os materiais, mas lembre-se de que
            alguns documentos podem ser rascunhos ou estar em processo de validação.
        </p>

        <a href="${urlDoDrive}" target="_blank" class="btn">
            Acessar o Drive
        </a>
    `;
    return html;
}
function renderModalViabilidade(episodio) {
    // 1. Obter as Estimativas Estratégicas
    const est = episodio.viabilidade_estimativas || {};
    // Garante que a estrutura {valor, just} exista
    const B5 = est.B5_impacto || { valor: 0, just: "" };
    const B6 = est.B6_produto || { valor: 0, just: "" };
    const C1 = est.C1_problema || { valor: 0, just: "" };
    const CV = est.CV_solucao || { valor: 0, just: "" };

    // 2. Calcular Totais
    const beneficioTotal = B5.valor + B6.valor;
    const custoTotal = C1.valor + CV.valor;

    // 3. Calcular o IVId e o V(%)
    const eixoV_percent = getKpiViabilidadeValor(episodio); // Usa a função global
    let ivid_ratio = 0;
    if (custoTotal > 0) {
        ivid_ratio = beneficioTotal / custoTotal;
    }

    // 5. Montar o HTML
    let html = `
        <div class="meta-destaque">
            Índice de Viabilidade (V%): <strong>${eixoV_percent.toFixed(1)}%</strong>
        </div>
        
        <p style="font-size: 0.9em; text-align: center; color: #555;">
            O Eixo V é o KPI estratégico (Benefício Total / Custo Total).<br>
            Um valor > 100% indica um "business case" saudável.
        </p>

        <table>
            <thead>
                <tr>
                    <th>Componente</th>
                    <th>Valor Estimado (R$)</th>
                    <th>Justificativa</th>
                </tr>
            </thead>
            <tbody>
                <tr style="background-color: #f0fdf4;">
                    <td>(B5) Benefício - Impacto (Face 5)</td>
                    <td>R$ ${B5.valor.toFixed(2)}</td>
                    <td style="white-space: normal;">${B5.just || 'N/A'}</td>
                </tr>
                <tr style="background-color: #f0fdf4; font-weight: bold;">
                    <td>(B6) Benefício - Produto (Face 6)</td>
                    <td>R$ ${B6.valor.toFixed(2)}</td>
                    <td style="white-space: normal;">${B6.just || 'N/A'}</td>
                </tr>
                <tr style="font-weight: bold; background-color: #dcfce7;">
                    <td style="text-align: right;">Total Benefício Estimado:</td>
                    <td>R$ ${beneficioTotal.toFixed(2)}</td>
                    <td></td>
                </tr>

                <tr style="background-color: #fef2f2;">
                    <td>(C1) Custo - Problema (Face 1)</td>
                    <td>R$ ${C1.valor.toFixed(2)}</td>
                    <td style="white-space: normal;">${C1.just || 'N/A'}</td>
                </tr>
                <tr style="background-color: #fef2f2; font-weight: bold;">
                    <td>(CV) Custo - Solução (Eixo V)</td>
                    <td>R$ ${CV.valor.toFixed(2)}</td>
                    <td style="white-space: normal;">${CV.just || 'N/A'}</td>
                </tr>
                <tr style="font-weight: bold; background-color: #fee2e2;">
                    <td style="text-align: right;">Total Custo Estimado:</td>
                    <td>R$ ${custoTotal.toFixed(2)}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <div class="bloco-calculo">
            <h4>Memória de Cálculo (IVId)</h4>
            1. Benefício Total = (B5 + B6)
               = (R$ ${B5.valor.toFixed(2)}) + (R$ ${B6.valor.toFixed(2)})
               = R$ ${beneficioTotal.toFixed(2)}
            <br>
            2. Custo Total = (C1 + CV)
               = (R$ ${C1.valor.toFixed(2)}) + (R$ ${CV.valor.toFixed(2)})
               = R$ ${custoTotal.toFixed(2)}
            <br>
            3. IVId (Ratio) = Benefício Total / Custo Total
               = R$ ${beneficioTotal.toFixed(2)} / R$ ${custoTotal.toFixed(2)}
               = ${ivid_ratio.toFixed(3)}
            <br>
            4. V% (KPI) = IVId * 100
               = <strong>${eixoV_percent.toFixed(1)}%</strong>
        </div>
    `;
    
    // Adiciona o modal tático (log de orçamento)
    const kpi_tatico = episodio.kpis?.viabilidade;
    const itens_taticos = kpi_tatico?.itens || [];
    if (itens_taticos.length > 0) {
         html += `
            <h4 style="margin-top: 25px; border-top: 1px solid #ccc; padding-top: 15px;">
                Controle Orçamentário (Tático - Log)
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
    const nomeImagem = episodio.kpis?.cuboImagem || '';

    // 1. Get Tolerancia Valor e Memoria
    let metaLabel = 'N/D';
    let memoria = "Análise não disponível.";
    let kpiResumo = '--';

    if (typeof kpi === 'object' && kpi !== null) {
        metaLabel = `${(kpi.valor || 0) * 100}%`;
        memoria = kpi.memoriaDeCalculo || "Análise não disponível.";
        kpiResumo = kpi.resumo || '--';
    } else if (typeof kpi === 'number') {
        metaLabel = `${kpi * 100}%`;
        kpiResumo = `${metaLabel} (Definida)`;
        memoria = `A tolerância para este episódio foi definida em ${metaLabel}.`;
    }

    // 2. NOVO: Diagnóstico de Coerência (Cor)
    let textoAlertaCoerencia = ""; // Começa vazio
    if (nomeImagem.includes('-cinza')) {
        textoAlertaCoerencia = `
            <div class="bloco-alerta-viés" style="border-color: #fca5a5; background-color: #fef2f2; color: #991b1b;">
                <strong style="color: #b91c1c;">Alerta de Incoerência Metodológica</strong>
                <p>O Cubo está cinza porque o conteúdo das 6 faces não está alinhado ou não foi totalmente classificado.</p>
                <p><strong>Ação:</strong> Abra o <strong>editor-dados.html</strong>, carregue este projeto e verifique a "Cadeia de Coerência" (✅, ⚠️, ❌) no Orientador Metodológico.</p>
                <ul>
                    <li>Verifique se todas as 6 faces possuem uma classificação selecionada.</li>
                    <li>Verifique se alguma seleção está marcada com "❌" (Incoerente).</li>
                </ul>
            </div>`;
    }

    // 3. Diagnóstico de Viés (Inclinação)
    const prefixoInclinacao = getInclinacaoCubo(episodio);
    let textoAlertaVies = ""; // Começa vazio
    
    switch (prefixoInclinacao) {
        case 'V':
            textoAlertaVies = `
                <div class="bloco-alerta-viés">
                    <strong>Diagnóstico (Alerta "V"): O Viés da "Paralisia por Análise"</strong>
                    <p>O Pilar Dominante "Viabilidade" (recursos) está saudável, mas o projeto não avança na execução (Prazo e Publicação fracos).</p>
                    <p><strong>Interpretação:</strong> O pesquisador, evitando tarefas de execução (Metodologia), tende a alocar esforço em atividades "seguras":</p>
                    <ul>
                        <li><strong>Favorece:</strong> "Referencial Teórico" (Face 3), em um ciclo de refinamento infinito; e "Impacto na Sociedade" (Face 5), teorizando sobre a relevância sem construir a solução.</li>
                        <li><strong>Negligencia:</strong> "Hipóteses de Solução" (Face 2) e "Produto da Pesquisa" (Face 6), que exigem a execução prática.</li>
                    </ul>
                </div>`;
            break;
        case 'T':
            textoAlertaVies = `
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
            textoAlertaVies = `
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

    // 4. Monta o HTML final
    let html = `
        <div class="meta-destaque">
            Resultado: <strong>${kpiResumo}</strong> (Limite: ${metaLabel})
        </div>
        
        ${textoAlertaCoerencia} 
        ${textoAlertaVies} 

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
    // Usa a meta calculada dinamicamente
    const meta = kpi?.metaPrazo || 0; 
    const entregas = kpi?.entregas || [];
    const dataEpisodio = episodio.date;
    
    const apuracaoValor = kpi?.valor || 0; 
    const apuracaoString = `${apuracaoValor.toFixed(1)}%`;
    const metaString = `${meta.toFixed(1)}%`; // Formata a meta
    
    let kpiResultadoString = 'N/A';
    if (meta > 0) {
        const kpiValor = (apuracaoValor / meta) * 100;
        kpiResultadoString = `${kpiValor.toFixed(1)}%`;
    } else if (apuracaoValor === 0) {
        kpiResultadoString = '100%';
    } else {
        kpiResultadoString = '999%'; // Adiantado
    }
    
    let html = `
        <div class="meta-destaque">
            Apuração: ${apuracaoString} / Meta (Planejada): ${metaString} = <strong>${kpiResultadoString}</strong>
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