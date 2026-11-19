# Comando Integrado de Campanha

Proposta de produto e protótipo navegável de uma plataforma de gestão de campanha eleitoral. A plataforma serve a qualquer cargo, em qualquer estado.

- Proposta: `index.html`
- Protótipo: `app/index.html`

## O que o protótipo mostra

1. **Painel do partido:** o partido vê e abre todas as candidaturas. Cada candidato vê só a própria.
2. **Estados de atuação:** a candidatura escolhe os estados em Configurações. Só esses estados aparecem nas telas.
3. **Painel da campanha:**
   - contatos engajados, ritmo e meta;
   - mapa, origem do cadastro e nível na rede;
   - entradas ao vivo e alertas.
4. **Território:**
   - grupos, subgrupos e sub-subgrupos com nome livre;
   - lista de municípios com busca, que pergunta em qual grupo incluir;
   - confirmação antes de tirar um município;
   - aviso quando um subgrupo sai do grupo-pai.
5. **Rede:** link e QR próprios para cada pessoa, com o caminho de cada cadastro até a candidatura.
6. **Contatos:** redes sociais gravadas num formato padrão, autorizações e histórico de contato.
7. **Lideranças:** Índice de Eficácia da Liderança, com pesos ajustáveis.
8. **Acordos e pagamentos:** lista fechada de objetos, dupla aprovação e alertas de conformidade.
9. **Cenários:** quociente e sobras, alianças, dobradinha e meta de votos.
10. **Alertas, relatórios em CSV, registro de atividades e 7 perfis de acesso.**

## Dados

Estados, municípios, códigos, malhas e população vêm do IBGE. A população é a do Censo 2022, e os arquivos estão em `app/dados`. Pessoas, telefones, contas, valores, partidos e candidaturas são fictícios. As mudanças feitas no protótipo ficam só no navegador de quem usa.

## Como abrir

Abra pelo GitHub Pages do repositório. Para abrir no próprio computador, sirva a pasta por um servidor local, por exemplo `python -m http.server`. Aberto direto do disco, o navegador bloqueia a leitura dos arquivos de dados.

Autor: Bruno-LSO.
