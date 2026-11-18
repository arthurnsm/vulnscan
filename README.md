# VulnScan

O **VulnScan** é uma aplicação web desenvolvida para automatizar etapas iniciais de reconhecimento e análise de segurança de aplicações web. O sistema integra ferramentas de linha de comando em um processo único, permitindo realizar verificações de conectividade, descoberta de portas, identificação de tecnologias, enumeração de diretórios e detecção de possíveis exposições e vulnerabilidades.

A aplicação oferece dois modos de varredura, **Fast Scan** e **Deep Scan**, que utilizam configurações diferentes para equilibrar velocidade e abrangência. Os resultados produzidos pelas ferramentas são processados e reunidos em um relatório com informações sobre o alvo, serviços identificados, rotas encontradas e achados classificados por severidade.

O projeto utiliza execução local das ferramentas e foi desenvolvido no contexto da disciplina de Análise e Projeto de Sistemas.

## Funcionamento

O processo de escaneamento é dividido nas seguintes etapas:

1. O usuário informa o endereço do alvo e seleciona o modo de varredura.
2. A aplicação realiza uma verificação inicial de conectividade por ICMP (ping).
3. O backend inicia os scanners correspondentes ao modo escolhido.
4. As ferramentas executam suas verificações concorrentemente e retornam resultados estruturados.
5. O orquestrador consolida as saídas em um objeto JSON.
6. O frontend acompanha o progresso por Server-Sent Events (SSE) e, ao final, apresenta o relatório.

As ferramentas são executadas como processos locais pelo backend em Python. A aplicação não utiliza um servidor externo para realizar as varreduras.

### Modos de escaneamento

| Ferramenta | Fast Scan | Deep Scan |
|---|---|---|
| Nmap | Portas comuns e identificação leve de serviços | Varredura ampliada, identificação de serviços e scripts padrão |
| HTTPX | Código HTTP e título da página | Código HTTP, título, tecnologias, redirecionamentos, IP e CNAME |
| FFUF | Wordlist reduzida e tempo limitado | Wordlist ampliada, extensões adicionais e maior tempo de execução |
| Nuclei | Não executado | Templates de exposições, configurações e identificação automatizada de tecnologias |

Após a verificação inicial de conectividade, Nmap, HTTPX e FFUF são executados nos dois modos. O Deep Scan acrescenta o Nuclei.

## Ferramentas e configurações

Os comandos apresentados nesta seção correspondem aos parâmetros definidos nos scripts de execução do projeto. Os valores entre `< >` são substituídos em tempo de execução.

### Nmap

O [Nmap](https://nmap.org/) é utilizado para identificar portas TCP abertas e serviços disponíveis no host. O backend interpreta sua saída XML e extrai informações de portas, protocolos, produtos, versões e scripts executados.

**Fast Scan**

```bash
nmap -F -sV --version-light -T4 --host-timeout 25s --max-retries 1 -oX - <host>
```

**Deep Scan — alvo local**

```bash
nmap -sT -sV -sC -p- -T4 --min-rate 500 --max-retries 1 --host-timeout 150s -oX - <host>
```

**Deep Scan — demais hosts**

```bash
nmap -sT -sV -sC --top-ports 1000 -T4 --min-rate 500 --max-retries 1 --host-timeout 150s -oX - <host>
```

| Flag | Descrição |
|---|---|
| `-F` | Executa uma varredura reduzida das portas mais comuns. |
| `-sT` | Utiliza conexões TCP para verificar portas. |
| `-sV` | Identifica serviços e suas versões. |
| `--version-light` | Reduz a intensidade das sondas de detecção de versões. |
| `-sC` | Executa os scripts padrão do Nmap Scripting Engine. |
| `-p-` | Verifica as 65.535 portas TCP. |
| `--top-ports 1000` | Seleciona as mil portas mais frequentes. |
| `-T4` | Define o perfil de temporização. |
| `--min-rate 500` | Configura a taxa mínima de envio de pacotes solicitada. |
| `--max-retries 1` | Limita retransmissões. |
| `--host-timeout` | Estabelece o tempo limite de análise por host. |
| `-oX -` | Envia os resultados XML para a saída padrão. |

No Deep Scan, a varredura de todas as portas é utilizada apenas para `localhost`, `127.0.0.1` e `::1`. Os demais hosts utilizam as mil portas principais.

O subprocesso Python possui um timeout adicional de 900 segundos, independente do `--host-timeout`.

### HTTPX

O [HTTPX da ProjectDiscovery](https://github.com/projectdiscovery/httpx) é responsável por realizar sondagens HTTP/HTTPS e identificar informações sobre os serviços web.

**Fast Scan**

```bash
httpx -u <url> -status-code -title -json -o <saida.json> -silent
```

**Deep Scan**

```bash
httpx -u <url> -status-code -title -tech-detect -follow-redirects -ip -cname -json -o <saida.json> -silent
```

| Flag | Descrição |
|---|---|
| `-u` | Define a URL que será analisada. |
| `-status-code` | Obtém o código de resposta HTTP. |
| `-title` | Extrai o título da página. |
| `-tech-detect` | Identifica tecnologias a partir de assinaturas. |
| `-follow-redirects` | Segue redirecionamentos HTTP. |
| `-ip` | Obtém o endereço IP identificado. |
| `-cname` | Obtém informações de registros CNAME. |
| `-json` | Produz resultados em JSON. |
| `-o` | Define o arquivo temporário de saída. |
| `-silent` | Reduz mensagens auxiliares. |

O tempo limite configurado para o subprocesso HTTPX é de 90 segundos.

Caso o executável oficial da ProjectDiscovery não esteja disponível ou sua execução falhe, o backend utiliza uma implementação alternativa em Python. Essa rotina realiza requisições HTTP/HTTPS, obtém cabeçalhos, título, IP e informações básicas de tecnologias.

A alternativa nativa não oferece necessariamente a mesma cobertura do HTTPX oficial.

### FFUF

O [FFUF](https://github.com/ffuf/ffuf) é utilizado para descoberta de diretórios, arquivos e endpoints por meio de fuzzing de caminhos.

O projeto mantém duas wordlists principais:

- `backend/wordlists/fast_fuzzing.txt`
- `backend/wordlists/deep_fuzzing.txt`

Antes da execução, o backend gera uma wordlist temporária. Caminhos prioritários são colocados no início, seguidos das entradas selecionadas da lista principal.

Entre os caminhos prioritários estão `.env`, `.git/config`, `robots.txt`, `admin`, `login`, `api`, `openapi.json` e possíveis arquivos de backup.

O modo Fast inclui até 2.500 entradas adicionais, enquanto o Deep inclui até 8.000. O arquivo `ffuz.txt` é utilizado como alternativa quando a wordlist específica não está disponível.

**Fast Scan**

```bash
ffuf -u <url>/FUZZ -w <wordlist> -t 80 -mc 200,204,301,302,307,401,403 -ac -maxtime 20 -timeout 3 -o <saida.json> -of json -s
```

**Deep Scan**

```bash
ffuf -u <url>/FUZZ -w <wordlist> -t 100 -e .php,.html,.txt,.bak,.env -mc 200,204,301,302,307,401,403 -ac -maxtime 90 -timeout 4 -o <saida.json> -of json -s
```

| Flag | Descrição |
|---|---|
| `-u` | Define a URL, incluindo o marcador `FUZZ`. |
| `-w` | Seleciona a wordlist utilizada na execução. |
| `-t` | Configura o número de workers concorrentes. |
| `-e` | Adiciona extensões aos caminhos testados. |
| `-mc` | Filtra os códigos HTTP considerados relevantes. |
| `-ac` | Ativa a calibração automática de respostas para reduzir falsos positivos. |
| `-maxtime` | Define o tempo máximo de fuzzing em segundos. |
| `-timeout` | Configura o timeout de cada requisição. |
| `-o` | Define o arquivo de resultados. |
| `-of json` | Produz saída em JSON. |
| `-s` | Executa em modo silencioso. |

Após a execução, o backend aplica filtros adicionais para remover resultados repetitivos, redirecionamentos genéricos e respostas com características de páginas inexistentes (*soft 404*).

O timeout externo do subprocesso Python é de 900 segundos. Ele é diferente do limite de 20 ou 90 segundos configurado por `-maxtime`.

### Nuclei

O [Nuclei](https://github.com/projectdiscovery/nuclei) utiliza templates para verificar exposições, configurações inseguras e possíveis vulnerabilidades conhecidas.

Na implementação atual, o Nuclei participa apenas do **Deep Scan**, executando duas passagens concorrentes.

**Passagem 1 — templates selecionados**

```bash
nuclei -u <url> -t <diretorios-de-templates> -severity info,low,medium,high,critical -c 60 -rl 200 -timeout 4 -retries 1 -mhe 200 -duc -jsonl -o <saida-1.json> -silent
```

A primeira passagem utiliza, conforme os templates disponíveis localmente:

- `ssl/`
- `http/exposures/`
- `http/misconfiguration/`
- `http/exposed-panels/`

O código também prevê os caminhos alternativos `cves/` e `exposures/` para instalações com outra organização dos templates.

**Passagem 2 — seleção automática**

```bash
nuclei -u <url> -as -severity low,medium,high,critical -c 60 -rl 200 -timeout 4 -retries 1 -mhe 200 -duc -jsonl -o <saida-2.json> -silent
```

| Flag | Descrição |
|---|---|
| `-u` | Define a URL do alvo. |
| `-t` | Seleciona os diretórios de templates. |
| `-as` | Seleciona templates automaticamente com base nas tecnologias detectadas. |
| `-severity` | Filtra templates por severidade. |
| `-c` | Define a concorrência de execução. |
| `-rl` | Limita a taxa de requisições. |
| `-timeout` | Configura o tempo máximo por requisição. |
| `-retries` | Limita as tentativas adicionais. |
| `-mhe` | Define o limite de erros por host. |
| `-duc` | Desativa a verificação de atualização automática. |
| `-jsonl` | Produz resultados em JSON Lines. |
| `-o` | Define o arquivo de saída. |
| `-silent` | Reduz mensagens auxiliares. |

Cada passagem possui um timeout de 120 segundos na implementação Python. Os resultados são combinados e deduplicados considerando identificador do template, matcher, endereço correspondente e dados extraídos.

O módulo possui também uma configuração para execução simplificada do Nuclei, mas essa configuração não é acionada pelo orquestrador Fast atual.

## Arquitetura

| Camada | Tecnologias | Responsabilidade |
|---|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS | Interface, seleção do alvo, acompanhamento e relatórios |
| API web | Next.js Route Handlers | Comunicação com a camada de execução |
| Backend | Python, FastAPI, asyncio | Validação, orquestração e consolidação |
| Scanners | Nmap, HTTPX, FFUF, Nuclei | Execução das verificações |
| Comunicação | HTTP, SSE e JSON | Transmissão de estados e resultados |

A interface utiliza a rota `/api/scan/stream` do Next.js. Essa rota tenta estabelecer comunicação com o FastAPI em `127.0.0.1:8001`.

Quando a conexão não é estabelecida, o Next.js possui uma alternativa de execução direta do script Python por processo filho.

O backend disponibiliza os seguintes endpoints:

| Método | Rota | Função |
|---|---|---|
| POST | `/api/ping` | Verifica conectividade do alvo |
| POST | `/api/scan` | Executa uma varredura e retorna JSON |
| POST | `/api/scan/stream` | Executa a varredura com transmissão de eventos SSE |

A execução dos scanners é concorrente após a etapa inicial de validação. O orquestrador recebe os resultados individuais, emite os eventos correspondentes e constrói o relatório consolidado.


## Instalação

### Pré-requisitos

A execução exige Node.js, npm, Python 3 e as dependências declaradas no repositório.

Os scanners também precisam estar disponíveis no sistema:

- Nmap instalado e acessível pelo `PATH`.
- FFUF disponível pelo `PATH` ou como `backend/scans/ffuf.exe` no Windows.
- HTTPX da ProjectDiscovery, recomendado para utilizar a implementação completa.
- Nuclei e seus templates para o Deep Scan.

Os executáveis externos não são instalados automaticamente pelas dependências de Node.js ou Python.

### Obter o projeto

```bash
git clone https://github.com/arthurnsm/vulnscan.git
cd vulnscan
```

Instale as dependências do frontend:

```bash
npm install
```

Instale as dependências Python:

```bash
python -m pip install -r requirements.txt
```

O arquivo `requirements.txt` inclui dependências específicas do Windows, como `pywin32` e `WMI`. A execução em Linux ou macOS pode exigir ajustes nesse arquivo.

### Iniciar a aplicação

Inicie o backend em um terminal:

```bash
python backend/api/main.py
```

O FastAPI será iniciado na porta `8001`.

Em outro terminal, na raiz do projeto, execute:

```bash
npm run dev
```

A interface estará disponível em:

```text
http://localhost:3000
```

### Exemplo de requisição

Com o backend iniciado, é possível solicitar uma varredura por HTTP. O exemplo utiliza um serviço local de teste, sob controle do operador:

```bash
curl -X POST http://127.0.0.1:8001/api/scan \
  -H "Content-Type: application/json" \
  -d '{"alvoUrl":"http://127.0.0.1:8080","isDeepScan":false}'
```

O valor `false` seleciona o Fast Scan, enquanto `true` seleciona o Deep Scan.

Para receber os eventos de execução, utiliza-se o endpoint `/api/scan/stream`.

## Relatórios

Ao término do escaneamento, os resultados são organizados em uma interface que apresenta informações do alvo, duração, serviços identificados, rotas e possíveis problemas de segurança.

O relatório inclui um **Security Score** calculado por uma regra heurística. O valor inicial é 100, com descontos de:

| Severidade | Desconto por achado |
|---|---|
| Crítico | 25 pontos |
| Alto | 12 pontos |
| Médio | 5 pontos |
| Baixo | 1 ponto |
| Informativo | 0 pontos |

A implementação atual restringe o resultado ao intervalo de **12 a 100 pontos**.

Esse indicador não representa uma medição conclusiva de segurança. A interpretação depende da cobertura da varredura e da validação dos resultados.

A interface permite consultar, filtrar e exportar os achados em JSON. A exportação específica do relatório em PDF ainda não está implementada na versão analisada.

O último relatório é armazenado no navegador. Quando não existem resultados recentes, a página apresenta dados demonstrativos identificados como exemplo.

## Próximos passos

O projeto continua em desenvolvimento e ainda possui algumas limitações:

- A validação inicial depende de resposta a ping ICMP. Um host pode oferecer HTTP/HTTPS e ainda assim não responder a ICMP.
- Os tempos configurados nos scanners não garantem um tempo máximo para o processo completo.
- A API ainda não possui, nas rotas analisadas, controle de autenticação, lista de alvos autorizados ou limitação de 30 requisições por IP.
- As regras de classificação de risco são heurísticas. Uma porta aberta, um diretório encontrado ou uma assinatura de template não comprovam necessariamente uma vulnerabilidade.
- Nem todo resultado do Nuclei corresponde a uma CVE.
- Os scanners dependem da disponibilidade dos executáveis e, no caso do Nuclei, dos templates instalados.
- O sistema não mantém um histórico persistente de relatórios no backend.
- A interface e a configuração de execução são voltadas principalmente a um ambiente local.

## Uso autorizado

O VulnScan destina-se à análise de sistemas próprios, ambientes de laboratório e alvos para os quais exista autorização explícita de teste.

O operador deve respeitar o escopo autorizado, os limites de requisições e as condições de uso dos sistemas analisados. Como as ferramentas são executadas localmente e podem gerar tráfego significativo, a aplicação não deve ser disponibilizada publicamente sem controles adequados de acesso e execução.

Os resultados devem ser utilizados como apoio ao processo de investigação e precisam de validação técnica antes de serem considerados vulnerabilidades confirmadas.
