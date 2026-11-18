# Análise de Sistemas - VulScanner

## 📂 Relatório de Varredura

**Fontes encontradas:** 0 materiais de aula identificados no workspace ou diretório de documentos.

*   **Material oficial / Orientações do professor:** [NÃO ENCONTRADO]
*   **Projeto:** Código-fonte em `app/` (Next.js) e `backend/` (FastAPI).
*   **Temas identificados:** Escaneamento de vulnerabilidades (Nmap, FFUF), Orquestração assíncrona, API REST.
*   **Conflitos encontrados no projeto:** A interface gráfica prevê uma etapa de "Alive Probing (HTTPX)" (Node 4 do diagrama no frontend), porém os orquestradores no backend (`fast_orchestrator.py` e `deep_orchestrator.py`) implementam apenas NMAP e FFUF.
*   **Modo:** **Baseline** (Operando com base na análise direta do código por ausência de material metodológico superior).

---

## 🎯 Requisitos Funcionais (RF)
*Ações e comportamentos que o sistema deve realizar.*

*   **RF-01:** O sistema deve permitir o envio de uma URL alvo e o tipo de varredura desejada (Fast ou Deep) através de uma API REST.
*   **RF-02:** O sistema deve executar a ferramenta **Nmap** para realizar port scanning no alvo informado.
*   **RF-03:** O sistema deve executar a ferramenta **FFuf** para realizar fuzzing de diretórios no alvo informado, utilizando a wordlist adequada para o tipo de scan.
*   **RF-04:** O orquestrador deve executar as ferramentas de varredura (Nmap e FFuf) de forma **concorrente** (assíncrona).
*   **RF-05:** O sistema deve consolidar os resultados de todas as ferramentas executadas e retornar um relatório único em formato JSON para o frontend.
*   **RF-06 [Pendente/Proposto]:** O sistema deve executar "Alive Probing" via HTTPX (previsto no frontend, ausente no backend).

## ⚙️ Requisitos Não Funcionais (RNF)
*Restrições, qualidade e arquitetura.*

*   **RNF-01 (Arquitetura):** O sistema deve ser distribuído, com o frontend desenvolvido em React/Next.js e o backend desenvolvido em Python/FastAPI.
*   **RNF-02 (Desempenho):** A execução dos scans no backend não deve bloquear a thread principal da API (deve utilizar `asyncio`), permitindo o recebimento de requisições simultâneas.
*   **RNF-03 (Usabilidade):** O frontend deve fornecer feedback visual do estado de carregamento ("Escaneando...") e desabilitar o botão de submissão enquanto a requisição estiver em processamento.
*   **RNF-04 (Interoperabilidade):** O backend deve possuir permissões adequadas para instanciar subprocessos do sistema operacional para a execução de binários externos (ex: `ffuf.exe`).

## 📜 Regras de Negócio (RN)
*Políticas do domínio.*

*   **RN-01 (Validação de Alvo):** Uma varredura não pode ser iniciada se a URL do alvo estiver vazia ou em formato inválido.
*   **RN-02 (Fast Scan):** A modalidade "Fast" deve priorizar velocidade, utilizando listas de palavras reduzidas (`fast_fuzzing.txt`) e parâmetros otimizados para tempo.
*   **RN-03 (Deep Scan):** A modalidade "Deep" deve priorizar cobertura, utilizando listas de palavras exaustivas (`deep_fuzzing.txt`) e parâmetros detalhados de inspeção.

---

**Nota sobre a validação com as aulas:**
Como não foram encontrados arquivos contendo os materiais das aulas (PDFs, docs, referências) no seu projeto ou pasta Documentos, não foi possível realizar o de/para com os critérios do professor. Se você possuir o material, por favor, cole-o aqui ou mova-o para a pasta do projeto para que eu possa cruzar a metodologia exigida com a implementação atual.
