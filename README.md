# Multiplica

Proposta de produto e protótipo navegável da Multiplica (multipliqueai.com.br), a plataforma de rede de apoiadores para campanhas eleitorais. A plataforma serve a qualquer cargo, em qualquer estado, e a qualquer partido.

Conceito: uma boa ideia, multiplicada por muita gente. Cada apoiador recebe um link próprio ("Multiplique aí"), chama quem conhece, e cada pessoa que entra tem um caminho até a fonte inicial.

- Proposta: `index.html`
- Protótipo: `app/index.html`

## O que o protótipo mostra

1. **Entrar:** um cartão por perfil de exemplo, com o que cada perfil vê. "Trocar perfil", no alto, volta para a escolha.
2. **Partido:** vê só os números de cada campanha e não muda nada. Cria o primeiro administrador de cada campanha.
3. **Equipe e acessos:** o administrador da campanha dá acesso, cria perfis e outros administradores, e marca as telas e as regras de cada perfil.
4. **Início:**
   - saudação e a frase do dia;
   - o link de convite da pessoa, com o botão "Multiplique aí";
   - "O que fazer agora", com até 3 avisos.
5. **Pessoas:** lista de pessoas, quem trouxe quem e melhores lideranças. Cada pessoa mostra a fonte inicial.
6. **Mapa e regiões:** regiões com nome livre, lista de cidades com busca e aviso quando uma cidade sai da região de cima.
7. **Gastos e pagamentos:** para onde foi o dinheiro, por tipo de gasto e por cidade. Contrato e comprovante são opcionais.
8. **Simular votos, Avisos, Baixar planilhas, Histórico de ações e Ajustes da campanha.**
9. **Convite do apoiador:** "Paula te chamou", cadastro em 1 minuto e o próprio link no fim.

Toda tela cabe na janela, do celular à tela grande. O que não cabe vira partes, com abas no alto, e as tabelas mostram as linhas que cabem.

## Dados

Estados, municípios, códigos, malhas e população vêm do IBGE. A população é a do Censo 2022, e os arquivos estão em `app/dados`. Pessoas, telefones, contas, valores, partidos e candidaturas são fictícios. As mudanças feitas no protótipo ficam só no navegador de quem usa.

## Como abrir

Abra pelo GitHub Pages do repositório. Para abrir no próprio computador, sirva a pasta por um servidor local, por exemplo `python -m http.server`. Aberto direto do disco, o navegador bloqueia a leitura dos arquivos de dados.

Autor: Bruno-LSO.
