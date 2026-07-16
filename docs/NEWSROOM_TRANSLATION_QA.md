# QA de tradução

Antes da revisão humana, verificações locais comparam original e tradução:

- números, unidades, datas e URLs;
- siglas e nomes próprios detectáveis;
- ausência de HTML novo;
- texto não vazio e limite de tamanho;
- indício lexical mínimo de pt-BR;
- versão do provider e do glossário.

Falha em qualquer check impede o estado `review-required` e leva a `failed`. Passar nos checks não significa correção linguística nem factual: significa apenas que os guardrails mecânicos passaram. O revisor compara original e tradução, registra ator e notas e pode aprovar, rejeitar ou solicitar retry. Nenhuma aprovação editorial ou publicação decorre dessa decisão.
