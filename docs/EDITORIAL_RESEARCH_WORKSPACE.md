# Workspace Editorial de Pesquisa

O Workspace de Pesquisa é uma rota privada da Central Editorial em `/admin/research-workspace/:scientificWorkId`. Ele agrega, sem recalcular, o registro do Radar Científico, dossiê estrutural, evidências, grafo, identidades canônicas, conceitos, memória temporal e tendências já persistidos localmente.

Cada módulo informa disponibilidade e contagem. Ausência ou falha de um módulo produz estado parcial, sem impedir a leitura dos demais. O piloto é `radar-70ab9f6136b8d720`, DOI `10.1002/advs.202510481`.

As abas são Visão geral, Evidências, Grafo, Conceitos, Memória, Tendências, Notas, Checklist e Histórico. A busca é determinística e local. O Workspace não coleta fontes, recalcula métricas, gera texto, cria artigo, publica ou acessa ambientes remotos.

Os dados são entregues somente pela API administrativa autenticada, com `private, no-store` e proteção `noindex`. Abrir um Workspace registra `research.workspace.opened` sem conteúdo científico ou editorial.
