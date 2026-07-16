# Política de fontes da redação algorítmica

## Clusters e traduções

Cada claim e pacote preserva nome, instituição e URL original. Múltiplos feeds da mesma instituição não contam como confirmação independente. Apenas título/snippet limitado pode entrar na tradução; corpo integral, imagem e paywall permanecem proibidos. Tradução não remove atribuição nem cria direito de republicação.

Fonte real exige evidência, revisor, HTTPS, atribuição e notas de direitos. O coletor lê apenas feed, limita snippet/resposta, não abre matéria, baixa imagem ou contorna paywall. Saúde não altera confiança.

## Princípios

- confiança é um sinal editorial, não garantia de acerto;
- notícia não substitui documento primário;
- empresa não é fonte neutra sobre si mesma;
- fonte bloqueada nunca é coletada;
- toda atribuição mantém nome e link da origem;
- dúvida, conflito e incerteza devem permanecer visíveis à revisão humana.

## Cadastro

Uma fonte precisa de identidade, homepage, tipo, idioma, países, temas, nível de confiança, método, notas de termos e copyright. RSS/Atom exige `feedUrl` validada. URLs não fornecidas ou não confirmadas não devem ser inventadas.

O catálogo pode permanecer vazio. Exemplos operacionais devem ficar inativos e explicitamente pendentes. Fixtures locais usam o domínio reservado `example.test`, são sintéticas e não representam fonte factual.

## Confiança

- `primary`: documento ou emissor primário pertinente;
- `high`: fonte especializada com histórico editorial robusto;
- `medium`: fonte útil que requer confirmação adicional;
- `contextual`: contexto, pista ou fixture que não sustenta afirmação sozinha;
- `blocked`: proibida para coleta.

Patrocínio ou relação comercial não altera score. Conteúdo promocional recebe penalidade transparente.

## Coleta permitida

O MVP aceita RSS 2.0, Atom e fixture local. Não aceita scraping HTML, redes sociais, browser automatizado, paywall, API paga ou protocolo diferente de HTTP(S). A ativação externa depende de autorização editorial explícita no catálogo.

## Direitos e atribuição

O sistema armazena somente metadados necessários e snippet de até 500 caracteres. Não copia matéria completa, não remove atribuição, não baixa imagens e não produz paráfrase ou tradução automática. O link original é obrigatório.

Termos do site e restrições de copyright prevalecem sobre capacidade técnica. Se o uso não estiver claro, a fonte deve permanecer inativa ou bloqueada até revisão.

## Revisão

Uma fonte primária pode receber bônus, mas ainda exige leitura e contextualização. Confirmação cruzada deve preservar fontes independentes. Republicações não contam automaticamente como confirmações independentes.

## Evidência para ativação

Fonte real ativa exige página oficial, feed explícito HTTPS, domínio correspondente, titularidade confirmada, termos e copyright analisados e decisão `confirmed`. Sitemap, URL inferida, domínio terceiro, termos incompatíveis ou resposta HTML bloqueiam a ativação. Mudança de feed invalida a evidência anterior.
