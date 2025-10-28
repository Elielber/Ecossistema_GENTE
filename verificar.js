    document.addEventListener('DOMContentLoaded', () => {

    // --- 1. O "Banco de Dados" de Hashes (O GABARITO) ---
    // Preencha com os hashes que você calculou no Passo 1
    const HASHES_CONHECIDOS = {
        "Aluga-ou-compra.html": {
            nomeAmigavel: "Ferramenta: Alugar ou Comprar v1",
            hash: "84d8b3f273675fa5067941733d0b30791676c8f227753296e7091f9d30888356" 
        },
        "CRITER-ANP.html": {
            nomeAmigavel: "Ferramenta: CRITER & ANP-Solver",
            hash: "SEU_HASH_DO_CRITER_HTML_VAI_AQUI"
        },
        "PLAN.html": {
            nomeAmigavel: "Ferramenta: PLAN",
            hash: "SEU_HASH_DO_PLAN_HTML_VAI_AQUI"
        }
        // ...
    };

    // --- 2. Elementos da Página ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const resultEl = document.getElementById('verification-result');

    // --- 3. Função Principal de Processamento ---
    function processarArquivo(file) {
        if (!file) return;

        const nomeArquivo = file.name;

        // Limpa o resultado anterior
        resultEl.textContent = 'Verificando... (Isso pode levar alguns segundos)';
        resultEl.className = 'result-info';

        // LÓGICA DO AJUSTE 3:
        // 1. Identifica o arquivo pelo NOME
        const ferramentaInfo = HASHES_CONHECIDOS[nomeArquivo];

        // 2. Procura no banco de dados
        if (ferramentaInfo) {
            // Encontrou! Agora vamos calcular o hash
            const hashEsperado = ferramentaInfo.hash;
            const nomeFerramenta = ferramentaInfo.nomeAmigavel;
            calcularHash(file, hashEsperado, nomeFerramenta);
        } else {
            // Não encontrou o arquivo no banco de dados
            resultEl.textContent = `❌ Arquivo Desconhecido. O arquivo "${nomeArquivo}" não é reconhecido pelo Ecossistema GENTE.`;
            resultEl.className = 'result-fail';
        }
    }

    // --- 4. Funções de Cálculo de Hash ---
    async function calcularHash(file, hashEsperado, nomeFerramenta) {
        try {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const calculatedHash = hashBufferParaHex(hashBuffer);

            // 3. Compara o hash calculado com o esperado
            if (calculatedHash === hashEsperado) {
                resultEl.textContent = `✅ Autêntico! O arquivo é uma cópia original da ferramenta "${nomeFerramenta}".`;
                resultEl.className = 'result-success';
            } else {
                resultEl.textContent = `❌ Falso/Modificado! O arquivo "${file.name}" foi alterado e não é autêntico.`;
                resultEl.className = 'result-fail';
            }
        } catch (err) {
            resultEl.textContent = 'Erro ao ler o arquivo.';
            resultEl.className = 'result-fail';
            console.error(err);
        }
    }
    
    function hashBufferParaHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // --- 5. Eventos de Drag-and-Drop e Input ---
    
       // Input de Arquivo (Procurar)
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processarArquivo(e.target.files[0]);
        }
    });

    // Drag-and-Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            processarArquivo(e.dataTransfer.files[0]);
        }
    });

});
