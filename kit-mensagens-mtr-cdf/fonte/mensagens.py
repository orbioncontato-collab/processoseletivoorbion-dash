# -*- coding: utf-8 -*-
"""Conteúdo do Kit: 6 categorias e 30 mensagens.

Cada mensagem tem:
  quando, para, canal, canais (whats/email), assunto, texto, campos, dica.
No texto, uma linha em branco separa parágrafos. Linhas iniciadas por "• "
viram itens de lista. Termos entre colchetes viram campos destacados.
"""

CATEGORIAS = [
    {
        "num": "01",
        "slug": "documentos",
        "nome": "Solicitação de documentos",
        "curto": "Documentos",
        "cor": "#17806C",
        "tint": "#E8F4F0",
        "desc": "Modelos para pedir MTR, dados cadastrais e comprovantes que ainda não chegaram até você. Use quando faltar algum papel para organizar ou arquivar uma movimentação.",
        "ilustra": "docs",
    },
    {
        "num": "02",
        "slug": "transporte",
        "nome": "Transporte e recebimento",
        "curto": "Transporte",
        "cor": "#2A6F97",
        "tint": "#E7F0F6",
        "desc": "Modelos para acompanhar a carga do agendamento até a chegada no destino. Ajudam a confirmar datas, retiradas, recebimentos e quantidades.",
        "ilustra": "truck",
    },
    {
        "num": "03",
        "slug": "pendencias-mtr",
        "nome": "Pendências de MTR",
        "curto": "Pendências de MTR",
        "cor": "#B7791F",
        "tint": "#FBF2E3",
        "desc": "Modelos para destravar manifestos com situação em aberto, recebimento não identificado ou informação que não confere com a movimentação.",
        "ilustra": "pending",
    },
    {
        "num": "04",
        "slug": "cdf",
        "nome": "Solicitação e cobrança de CDF",
        "curto": "CDF",
        "cor": "#0E5E57",
        "tint": "#E5F0EE",
        "desc": "Modelos para pedir, cobrar, acompanhar e confirmar o Certificado de Destinação Final, do primeiro contato ao encerramento da solicitação.",
        "ilustra": "cert",
    },
    {
        "num": "05",
        "slug": "divergencias",
        "nome": "Divergências e correções",
        "curto": "Divergências",
        "cor": "#B4533A",
        "tint": "#F8EBE6",
        "desc": "Modelos para apontar diferenças de peso, cadastro, classificação ou documentos, sempre pedindo verificação antes de qualquer ajuste.",
        "ilustra": "compare",
    },
    {
        "num": "06",
        "slug": "interno",
        "nome": "Comunicação e acompanhamento interno",
        "curto": "Comunicação interna",
        "cor": "#46597A",
        "tint": "#ECEFF5",
        "desc": "Modelos para falar com colegas e com a gestão: cobrar documentos, pedir atualização do controle, reportar pendências e avisar quando algo foi resolvido.",
        "ilustra": "folder",
    },
]

ASS = "[SEU NOME] | [SUA EMPRESA]"
ASS_EMAIL = "Atenciosamente,\n[SEU NOME]\n[CARGO] | [SUA EMPRESA]"

MENSAGENS = [
    # ---------------- CATEGORIA 01 ----------------
    {
        "cat": "01",
        "titulo": "Solicitar cópia do MTR",
        "quando": "Quando você precisa do MTR de uma movimentação para arquivo, conferência ou controle interno e ainda não tem o documento em mãos.",
        "para": "Transportador ou empresa responsável pela emissão do MTR",
        "canal": "WhatsApp ou e-mail",
        "canais": ["whats", "email"],
        "assunto": "Solicitação de cópia do MTR nº [NÚMERO DO MTR]",
        "texto": """Olá, [NOME DO CONTATO], tudo bem?

Estou organizando os registros de resíduos da [EMPRESA GERADORA] e preciso de uma cópia do MTR nº [NÚMERO DO MTR], referente à coleta realizada em [DATA DA COLETA].

Pode ser o arquivo em PDF ou as informações para consulta do documento no sistema utilizado. Se o número que tenho estiver diferente do registrado, peço que me avise para eu conferir aqui.

Agradeço pela ajuda!
""" + ASS,
        "dica": "Peça o arquivo em PDF. Ele é mais fácil de arquivar e de localizar depois.",
    },
    {
        "cat": "01",
        "titulo": "Solicitar dados do transportador",
        "quando": "Antes de programar uma coleta com um transportador novo, ou quando o cadastro dele no seu controle está incompleto ou desatualizado.",
        "para": "Transportador",
        "canal": "E-mail (melhor para anexos) ou WhatsApp",
        "canais": ["email", "whats"],
        "assunto": "Atualização de dados cadastrais | [EMPRESA TRANSPORTADORA]",
        "texto": """Olá, [NOME DO CONTATO], bom dia!

Estamos organizando a próxima movimentação de resíduos da [EMPRESA GERADORA] e precisamos atualizar o cadastro de vocês no nosso controle.

Poderiam nos enviar, por gentileza:
• Razão social e CNPJ;
• Endereço completo;
• Licença ou autorização ambiental para o transporte, conforme aplicável;
• Placa e tipo do veículo que fará a coleta;
• Nome e contato do responsável operacional.

Se vocês costumam enviar algum outro documento para esse tipo de serviço, pode mandar junto.

Agradeço desde já!
""" + ASS,
        "dica": "Guarde as respostas em uma pasta por transportador. Na próxima coleta, basta conferir se algo mudou.",
    },
    {
        "cat": "01",
        "titulo": "Solicitar dados do destinador",
        "quando": "Quando você precisa confirmar para onde o resíduo vai, antes de emitir o MTR ou de atualizar o controle de destinação.",
        "para": "Destinador (unidade que vai receber o resíduo)",
        "canal": "E-mail ou WhatsApp",
        "canais": ["email", "whats"],
        "assunto": "Confirmação de dados da unidade destinadora | [UNIDADE DESTINADORA]",
        "texto": """Olá, [NOME DO CONTATO], tudo bem?

Vamos encaminhar [TIPO DE RESÍDUO] da [EMPRESA GERADORA] para a unidade de vocês e preciso confirmar alguns dados antes de seguir com a documentação.

Pode me confirmar, por favor:
• Razão social, CNPJ e endereço da unidade que vai receber o resíduo;
• Licença ambiental vigente para essa atividade;
• Tipo de destinação previsto para esse resíduo;
• Se existe alguma exigência para o recebimento, como agendamento ou envio prévio de documentos.

Com essas informações, consigo deixar tudo alinhado antes da coleta.

Agradeço a atenção!
""" + ASS,
        "dica": "Confirme esses dados antes de emitir o MTR. Isso evita retrabalho com informações do destino.",
    },
    {
        "cat": "01",
        "titulo": "Solicitar documentação complementar",
        "quando": "Quando o MTR já existe, mas a movimentação ainda depende de algum documento adicional para fechar o registro, quando aplicável.",
        "para": "Transportador, destinador ou empresa parceira que tem o documento",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Documentação complementar | MTR nº [NÚMERO DO MTR]",
        "texto": """Prezado(a) [NOME DO CONTATO],

Estou finalizando o registro da movimentação vinculada ao MTR nº [NÚMERO DO MTR], realizada em [DATA DA COLETA], e ainda falta o seguinte documento no nosso arquivo: [DOCUMENTO SOLICITADO].

Precisamos dele para [MOTIVO DA SOLICITAÇÃO]. Poderia verificar se é possível encaminhá-lo até [PRAZO DESEJADO]?

Se esse documento não se aplicar a essa movimentação, peço que me informe, para eu registrar a justificativa no controle.

""" + ASS_EMAIL,
        "dica": "Escreva o nome completo do documento. Siglas internas podem não ser conhecidas pela outra empresa.",
    },
    {
        "cat": "01",
        "titulo": "Solicitar comprovantes de movimentação",
        "quando": "No fechamento do mês, na preparação de uma auditoria ou na consolidação de informações para declarações, como a DMR, quando aplicável.",
        "para": "Transportador ou empresa parceira responsável pelas coletas",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Comprovantes de movimentação | [PERÍODO]",
        "texto": """Olá, [NOME DO CONTATO], bom dia!

Estamos consolidando os registros de resíduos da [EMPRESA GERADORA] referentes a [PERÍODO] e precisamos reunir os comprovantes das movimentações feitas por vocês nesse intervalo.

Poderiam enviar, por gentileza, a relação das coletas com:
• Número do MTR de cada movimentação;
• Data da coleta;
• Tipo de resíduo e quantidade transportada;
• Comprovantes de entrega ou recebimento que tiverem disponíveis.

Se for mais prático, pode ser em planilha ou em um único arquivo compactado.

Agradeço pela parceria!
""" + ASS,
        "dica": "Defina um período fechado, como um mês, para a outra empresa saber exatamente o que enviar.",
    },
    # ---------------- CATEGORIA 02 ----------------
    {
        "cat": "02",
        "titulo": "Confirmar agendamento de coleta",
        "quando": "Um ou dois dias antes da coleta, para evitar viagem perdida, resíduo não separado ou documento emitido com a data errada.",
        "para": "Transportador",
        "canal": "WhatsApp",
        "canais": ["whats"],
        "assunto": "Confirmação de coleta | [DATA PREVISTA]",
        "texto": """Oi, [NOME DO CONTATO], tudo bem?

Passando para confirmar a coleta de [TIPO DE RESÍDUO] na [EMPRESA GERADORA], prevista para [DATA PREVISTA], por volta de [HORÁRIO].

Pode me confirmar se a data e o horário estão mantidos, e qual veículo e motorista vão fazer a coleta? Assim eu já aviso a portaria e deixo a documentação preparada.

Endereço de retirada: [ENDEREÇO DA COLETA]
Contato no local: [NOME E TELEFONE NO LOCAL]

Fico no aguardo. Agradeço!
""" + ASS,
        "dica": "Guarde a resposta do transportador. Se a coleta mudar, você tem o registro do que foi combinado.",
    },
    {
        "cat": "02",
        "titulo": "Confirmar retirada de resíduos",
        "quando": "No dia da coleta ou logo depois, quando você não estava no local e precisa saber se a retirada aconteceu como previsto.",
        "para": "Responsável no local (portaria, almoxarifado, produção) ou transportador",
        "canal": "WhatsApp",
        "canais": ["whats"],
        "assunto": "Retirada de resíduos | [DATA]",
        "texto": """Olá, [NOME DO CONTATO]!

A coleta de [TIPO DE RESÍDUO] estava prevista para hoje, [DATA], com a transportadora [EMPRESA TRANSPORTADORA]. Você consegue me confirmar se a retirada foi feita?

Se possível, me passe também:
• Horário aproximado de saída do veículo;
• Placa do veículo;
• Se o motorista levou o MTR e os demais documentos de transporte, quando aplicável;
• Se ficou algum volume para trás.

Uma foto do material carregado ou da via assinada, se houver, já ajuda bastante.

Agradeço!
[SEU NOME]""",
        "dica": "Quem estava no local costuma responder mais rápido. Mande a mensagem logo depois do horário previsto.",
    },
    {
        "cat": "02",
        "titulo": "Solicitar confirmação de recebimento",
        "quando": "Depois que a carga saiu, para confirmar com a unidade de destino que o resíduo chegou e foi recebido.",
        "para": "Destinador",
        "canal": "WhatsApp ou e-mail",
        "canais": ["whats", "email"],
        "assunto": "Confirmação de recebimento | MTR nº [NÚMERO DO MTR]",
        "texto": """Olá, [NOME DO CONTATO], bom dia!

No dia [DATA DA COLETA], a transportadora [EMPRESA TRANSPORTADORA] retirou [TIPO DE RESÍDUO] da [EMPRESA GERADORA] com destino à unidade de vocês, conforme o MTR nº [NÚMERO DO MTR].

Poderiam verificar, por gentileza, se essa carga já foi recebida? Se o recebimento já estiver registrado no sistema, peço que me confirmem a data.

Agradeço o retorno!
""" + ASS,
        "dica": "Se o destinador disser que a carga não chegou, siga com a Mensagem 09 para o transportador.",
    },
    {
        "cat": "02",
        "titulo": "Consultar status de uma carga",
        "quando": "Quando a carga já saiu há algum tempo e você não sabe se ela está em trânsito, se já chegou ou se houve algum problema no caminho.",
        "para": "Transportador",
        "canal": "WhatsApp",
        "canais": ["whats"],
        "assunto": "Status da carga | MTR nº [NÚMERO DO MTR]",
        "texto": """Oi, [NOME DO CONTATO], tudo certo?

Estou acompanhando a carga de [TIPO DE RESÍDUO] retirada na [EMPRESA GERADORA] em [DATA DA COLETA], vinculada ao MTR nº [NÚMERO DO MTR], com destino a [UNIDADE DESTINADORA].

Ainda não tenho a confirmação de chegada e queria entender em que etapa ela está. Já foi entregue, continua em trânsito ou aconteceu algum imprevisto?

Se houve qualquer mudança no trajeto ou no destino, me avise para eu ajustar o acompanhamento.

Agradeço!
[SEU NOME]""",
        "dica": "Informe o destino na mensagem. Isso ajuda o transportador a localizar a carga mais rápido.",
    },
    {
        "cat": "02",
        "titulo": "Confirmar quantidade recebida",
        "quando": "Quando você precisa do peso ou volume registrado na chegada para comparar com a quantidade declarada na saída.",
        "para": "Destinador",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Quantidade recebida | MTR nº [NÚMERO DO MTR]",
        "texto": """Prezado(a) [NOME DO CONTATO],

Para conferência do nosso controle, poderiam me informar a quantidade registrada no recebimento da carga vinculada ao MTR nº [NÚMERO DO MTR], recebida por vocês em [DATA DO RECEBIMENTO]?

Na saída, declaramos [QUANTIDADE DECLARADA] [UNIDADE DE MEDIDA] de [TIPO DE RESÍDUO].

Se houver ticket de balança ou outro registro de pesagem, agradeço se puderem enviar em anexo.

""" + ASS_EMAIL,
        "dica": "Se a diferença entre saída e recebimento for relevante, continue a conversa com a Mensagem 21.",
    },
    # ---------------- CATEGORIA 03 ----------------
    {
        "cat": "03",
        "titulo": "Solicitar atualização de MTR pendente",
        "quando": "Quando o MTR aparece com situação em aberto no sistema ou no seu controle e você precisa entender o que falta para ele avançar.",
        "para": "Transportador, destinador ou responsável pela próxima etapa do documento",
        "canal": "E-mail ou WhatsApp",
        "canais": ["email", "whats"],
        "assunto": "Situação do MTR nº [NÚMERO DO MTR]",
        "texto": """Olá, [NOME DO CONTATO], tudo bem?

Na consulta que fiz em [DATA DA CONSULTA], o MTR nº [NÚMERO DO MTR], emitido em [DATA DE EMISSÃO], aparece com a situação "[SITUAÇÃO EXIBIDA]".

Poderiam verificar, por gentileza, se existe alguma etapa pendente do lado de vocês, ou alguma informação que precisemos complementar para que o documento siga o fluxo?

Assim que tiver o retorno, atualizo o nosso controle.

Agradeço!
""" + ASS,
        "dica": "Copie a situação exatamente como aparece no sistema, entre aspas. Isso evita interpretações diferentes.",
    },
    {
        "cat": "03",
        "titulo": "Verificar MTR sem confirmação de recebimento",
        "quando": "Quando o prazo que você esperava já passou, ou o destinador diz que recebeu a carga, mas o recebimento ainda não aparece registrado no sistema.",
        "para": "Destinador",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Recebimento não identificado | MTR nº [NÚMERO DO MTR]",
        "texto": """Prezado(a) [NOME DO CONTATO],

Consultei o MTR nº [NÚMERO DO MTR], referente à carga de [TIPO DE RESÍDUO] enviada em [DATA DA COLETA], e ainda não identifiquei o registro de recebimento pela unidade [UNIDADE DESTINADORA].

Poderiam confirmar se a carga chegou e se o recebimento já foi lançado? Se houver algum motivo para o registro ainda não ter sido feito, peço que me informem, para eu saber como acompanhar.

Fico à disposição para enviar qualquer informação que ajude na verificação.

""" + ASS_EMAIL,
        "dica": "Se tiver um print da consulta, anexe. Assim a outra parte vê exatamente o que você está vendo.",
    },
    {
        "cat": "03",
        "titulo": "Comunicar inconsistência no MTR",
        "quando": "Quando você encontra no MTR um dado que não confere com a movimentação, como placa, resíduo, quantidade ou empresa.",
        "para": "Quem preencheu a informação (transportador, destinador ou equipe interna)",
        "canal": "E-mail (deixa o registro por escrito)",
        "canais": ["email"],
        "assunto": "Inconsistência identificada | MTR nº [NÚMERO DO MTR]",
        "texto": """Olá, [NOME DO CONTATO], bom dia!

Ao conferir o MTR nº [NÚMERO DO MTR], encontrei uma informação que parece não corresponder à movimentação realizada em [DATA DA COLETA]:

Campo: [CAMPO COM DIVERGÊNCIA]
Consta no MTR: [INFORMAÇÃO REGISTRADA]
Informação esperada: [INFORMAÇÃO SEGUNDO NOSSOS REGISTROS]

Poderiam verificar esse ponto e me dizer qual é o procedimento adequado para tratar a divergência, conforme as regras do sistema utilizado? Envio em anexo [DOCUMENTO DE APOIO] para ajudar na conferência.

Agradeço a atenção.
""" + ASS,
        "dica": "Mostre o dado registrado e o esperado um embaixo do outro. A comparação fica clara na primeira leitura.",
    },
    {
        "cat": "03",
        "titulo": "Solicitar análise de dados incorretos",
        "quando": "Quando você desconfia que um ou mais dados do documento estão errados, mas precisa que a outra parte confirme qual é a informação correta antes de qualquer ajuste.",
        "para": "Transportador, destinador ou consultoria responsável",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Pedido de análise de dados | MTR nº [NÚMERO DO MTR]",
        "texto": """Prezado(a) [NOME DO CONTATO],

Durante a conferência do MTR nº [NÚMERO DO MTR], surgiram dúvidas sobre algumas informações que talvez precisem de ajuste:
• [DADO 1 E O QUE PARECE ESTAR INCORRETO];
• [DADO 2 E O QUE PARECE ESTAR INCORRETO].

Antes de qualquer alteração, gostaria que vocês analisassem esses pontos e me confirmassem quais são os dados corretos. Se houver necessidade de ajuste, peço também uma orientação sobre como ele pode ser feito e por quem, de acordo com o sistema e as regras aplicáveis.

Fico no aguardo para seguirmos com segurança.

""" + ASS_EMAIL,
        "dica": "Use quando ainda houver dúvida. Se você já sabe qual dado está errado, a Mensagem 13 é mais direta.",
    },
    {
        "cat": "03",
        "titulo": "Acompanhar pendência de MTR não resolvida",
        "quando": "Quando você já pediu retorno sobre um MTR e o assunto continua parado. Serve para retomar o contato com firmeza e cordialidade.",
        "para": "A mesma pessoa ou empresa contatada anteriormente",
        "canal": "WhatsApp ou e-mail, na mesma conversa anterior",
        "canais": ["whats", "email"],
        "assunto": "Retomando: pendência do MTR nº [NÚMERO DO MTR]",
        "texto": """Olá, [NOME DO CONTATO], tudo bem?

Retomando o contato de [DATA DO PRIMEIRO CONTATO] sobre o MTR nº [NÚMERO DO MTR]. Até o momento, a pendência que identificamos continua em aberto: [RESUMO DA PENDÊNCIA].

Sei que a rotina é corrida, mas precisamos desse retorno para manter o controle da [EMPRESA GERADORA] em dia. Vocês conseguem me dar uma posição até [DATA LIMITE]?

Se o assunto estiver com outra pessoa da equipe, me indiquem com quem devo falar.

Agradeço!
""" + ASS,
        "dica": "Responda na mesma conversa da primeira solicitação. O histórico fica completo em um só lugar.",
    },
    # ---------------- CATEGORIA 04 ----------------
    {
        "cat": "04",
        "titulo": "Solicitar CDF ao destinador",
        "quando": "Quando a destinação já foi realizada e você precisa saber se o Certificado de Destinação Final daquela movimentação está disponível.",
        "para": "Destinador",
        "canal": "WhatsApp ou e-mail",
        "canais": ["whats", "email"],
        "assunto": "Solicitação de CDF | MTR nº [NÚMERO DO MTR]",
        "texto": """Olá, bom dia!

Poderiam, por gentileza, verificar a situação do Certificado de Destinação Final (CDF) referente à movimentação vinculada ao MTR nº [NÚMERO DO MTR]?

A movimentação foi realizada em [DATA DA COLETA], com destino à unidade [UNIDADE DESTINADORA].

Gostaria de confirmar se o certificado já está disponível ou se existe alguma informação pendente para a sua conclusão.

Agradeço desde já pelo retorno e fico à disposição caso precisem de alguma informação complementar.
""" + ASS,
        "dica": "Envie pelo canal que o destinador usa para atender demandas de documentos. A resposta tende a vir mais rápido.",
    },
    {
        "cat": "04",
        "titulo": "Reforçar cobrança de CDF pendente",
        "quando": "Quando você já pediu o CDF e não recebeu resposta conclusiva. O tom fica mais direto, mantendo a cordialidade.",
        "para": "Destinador (se possível, com cópia para o comercial ou responsável técnico)",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Segundo contato | CDF do MTR nº [NÚMERO DO MTR]",
        "texto": """Prezado(a) [NOME DO CONTATO],

Volto a entrar em contato sobre o CDF referente ao MTR nº [NÚMERO DO MTR], movimentação de [DATA DA COLETA], que solicitamos em [DATA DA PRIMEIRA SOLICITAÇÃO].

Até agora não recebemos o certificado nem uma posição sobre o andamento. Esse documento é importante para concluirmos o controle de destinação da [EMPRESA GERADORA].

Peço, por gentileza, um retorno até [DATA LIMITE] com uma destas informações:
• O CDF emitido;
• A previsão de emissão;
• O que está pendente para que ele seja emitido.

""" + ASS_EMAIL,
        "dica": "Use depois que a Mensagem 16 ou 18 ficou sem resposta. Se tiver o contato do comercial, coloque em cópia.",
    },
    {
        "cat": "04",
        "titulo": "Solicitar previsão de disponibilização do CDF",
        "quando": "Quando você precisa planejar um fechamento, uma auditoria ou um relatório e quer saber quando o certificado deve ficar disponível.",
        "para": "Destinador",
        "canal": "WhatsApp ou e-mail",
        "canais": ["whats", "email"],
        "assunto": "Previsão do CDF | MTR nº [NÚMERO DO MTR]",
        "texto": """Olá, [NOME DO CONTATO], tudo bem?

Estou organizando o [FECHAMENTO, RELATÓRIO OU AUDITORIA] da [EMPRESA GERADORA] e queria entender a previsão de emissão do CDF desta movimentação:

MTR nº [NÚMERO DO MTR]
Data da coleta: [DATA DA COLETA]
Resíduo: [TIPO DE RESÍDUO]

Vocês têm uma estimativa de quando o certificado deve ficar disponível? Se a emissão depender da conclusão do tratamento ou de alguma outra etapa, me contem, para eu planejar o acompanhamento.

Agradeço!
""" + ASS,
        "dica": "Anote a previsão informada no seu controle. Assim você sabe a data certa para voltar ao assunto.",
    },
    {
        "cat": "04",
        "titulo": "Informar CDF não localizado",
        "quando": "Quando o destinador informa que o CDF já foi emitido, mas você não encontra o certificado no sistema ou nos arquivos recebidos.",
        "para": "Destinador",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "CDF não localizado | MTR nº [NÚMERO DO MTR]",
        "texto": """Prezado(a) [NOME DO CONTATO],

Recebemos a informação de que o CDF referente ao MTR nº [NÚMERO DO MTR] já teria sido emitido. No entanto, ao consultar [LOCAL CONSULTADO] em [DATA DA CONSULTA], não localizamos o certificado.

Poderiam verificar, por favor:
• O número do CDF e a data de emissão;
• Se ele foi emitido para o CNPJ correto da [EMPRESA GERADORA];
• Se o MTR nº [NÚMERO DO MTR] está vinculado a esse certificado.

Se possível, peço também que reenviem o arquivo em anexo.

""" + ASS_EMAIL,
        "dica": "Antes de enviar, procure também na caixa de spam e em anexos de e-mails antigos do destinador.",
    },
    {
        "cat": "04",
        "titulo": "Confirmar recebimento de CDF",
        "quando": "Depois que o CDF chegou e você conferiu os dados. A mensagem encerra a solicitação e deixa registrado que o documento foi recebido.",
        "para": "Destinador",
        "canal": "E-mail ou WhatsApp",
        "canais": ["email", "whats"],
        "assunto": "Recebimento do CDF nº [NÚMERO DO CDF]",
        "texto": """Olá, [NOME DO CONTATO]!

Confirmo o recebimento do CDF nº [NÚMERO DO CDF], referente ao MTR nº [NÚMERO DO MTR], enviado em [DATA DO ENVIO].

Conferimos as informações principais do certificado e elas estão de acordo com os nossos registros. Com isso, encerramos essa solicitação por aqui.

Agradeço o apoio durante o acompanhamento.
""" + ASS,
        "dica": "Encontrou algum dado diferente no certificado? Use a Mensagem 24 antes de encerrar o assunto.",
    },
    # ---------------- CATEGORIA 05 ----------------
    {
        "cat": "05",
        "titulo": "Comunicar diferença de peso",
        "quando": "Quando a quantidade registrada no recebimento é diferente da declarada na saída e a diferença foge do que vocês consideram normal.",
        "para": "Destinador, com cópia para o transportador se fizer sentido",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Diferença de peso | MTR nº [NÚMERO DO MTR]",
        "texto": """Prezado(a) [NOME DO CONTATO],

Na conferência da movimentação vinculada ao MTR nº [NÚMERO DO MTR], identificamos uma diferença entre as quantidades registradas:

Declarada na saída: [QUANTIDADE NA SAÍDA] [UNIDADE]
Registrada no recebimento: [QUANTIDADE NO RECEBIMENTO] [UNIDADE]
Diferença: [DIFERENÇA] [UNIDADE]

Poderiam verificar o registro de pesagem do recebimento e nos ajudar a entender o motivo dessa diferença? Do nosso lado, envio em anexo [REGISTRO DE PESAGEM DA SAÍDA].

Se for necessário algum ajuste em documento, peço que nos orientem sobre o procedimento aplicável.

""" + ASS_EMAIL,
        "dica": "Confira se a unidade de medida é a mesma nos dois registros antes de apontar a diferença.",
    },
    {
        "cat": "05",
        "titulo": "Informar divergência cadastral",
        "quando": "Quando razão social, CNPJ, endereço ou outro dado de uma empresa aparece diferente em documentos, cadastros ou no sistema.",
        "para": "Empresa parceira com cadastro divergente (transportador ou destinador)",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Conferência de dados cadastrais | [NOME DA EMPRESA]",
        "texto": """Olá, [NOME DO CONTATO], bom dia!

Ao atualizar nosso controle de fornecedores de gestão de resíduos, percebemos que alguns dados da [NOME DA EMPRESA] aparecem diferentes nos documentos que temos:

• [DADO]: consta "[INFORMAÇÃO A]" em [DOCUMENTO A] e "[INFORMAÇÃO B]" em [DOCUMENTO B].

Poderiam confirmar qual é a informação correta e atual? Se houve alguma mudança recente, como troca de endereço ou de razão social, agradeço se puderem enviar o documento que comprove a atualização.

Agradeço a colaboração!
""" + ASS,
        "dica": "Indique em quais documentos aparece cada versão do dado. Isso acelera a conferência do outro lado.",
    },
    {
        "cat": "05",
        "titulo": "Solicitar análise de classificação do resíduo",
        "quando": "Quando a classificação, a descrição ou o código do resíduo informado no documento parece não corresponder ao material efetivamente gerado.",
        "para": "Responsável técnico pela classificação (consultoria, laboratório ou equipe interna)",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Análise da classificação do resíduo | [TIPO DE RESÍDUO]",
        "texto": """Prezado(a) [NOME DO CONTATO],

Ao revisar a documentação do resíduo [TIPO DE RESÍDUO], gerado em [SETOR OU PROCESSO DE ORIGEM], ficamos com dúvida sobre a classificação informada.

No documento [IDENTIFICAÇÃO DO DOCUMENTO], o resíduo aparece como [CLASSIFICAÇÃO OU CÓDIGO INFORMADO]. Pelas características do material e pelo processo que o gera, avaliamos que essa identificação talvez não esteja adequada.

Poderiam analisar esse ponto e nos orientar sobre a classificação correta, considerando as normas e os critérios aplicáveis? Se for preciso, enviamos informações do processo, fichas de produto ou laudos disponíveis.

""" + ASS_EMAIL,
        "dica": "Envie para quem tem competência técnica para avaliar a classificação e guarde a resposta junto ao documento.",
    },
    {
        "cat": "05",
        "titulo": "Comunicar divergência documental",
        "quando": "Quando documentos da mesma movimentação não conferem entre si, por exemplo MTR, nota fiscal, ticket de pesagem e CDF com informações diferentes.",
        "para": "Transportador, destinador ou empresa parceira envolvida",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Divergência entre documentos | MTR nº [NÚMERO DO MTR]",
        "texto": """Olá, [NOME DO CONTATO], tudo bem?

Ao organizar os documentos da movimentação de [DATA DA COLETA], vinculada ao MTR nº [NÚMERO DO MTR], notamos que algumas informações não estão consistentes entre os registros:

• [DOCUMENTO 1]: [INFORMAÇÃO REGISTRADA];
• [DOCUMENTO 2]: [INFORMAÇÃO REGISTRADA].

Como esses documentos se referem à mesma movimentação, precisamos entender qual informação está correta e se algum deles precisa ser revisado.

Poderiam verificar e nos dar um retorno? Envio os arquivos em anexo para facilitar a conferência.

Agradeço!
""" + ASS,
        "dica": "Anexe todos os documentos citados. Assim a outra parte confere tudo sem precisar pedir de novo.",
    },
    {
        "cat": "05",
        "titulo": "Solicitar posicionamento sobre carga recusada",
        "quando": "Quando o destinador recusou ou devolveu a carga, no todo ou em parte, e você precisa entender o motivo e os próximos passos.",
        "para": "Destinador, com cópia para o transportador",
        "canal": "E-mail (e ligação, se for urgente)",
        "canais": ["email"],
        "assunto": "Carga recusada | MTR nº [NÚMERO DO MTR]",
        "texto": """Prezado(a) [NOME DO CONTATO],

Fomos informados de que a carga de [TIPO DE RESÍDUO], vinculada ao MTR nº [NÚMERO DO MTR] e transportada pela [EMPRESA TRANSPORTADORA] em [DATA DA COLETA], foi [RECUSADA, DEVOLVIDA OU RECEBIDA PARCIALMENTE] pela unidade de vocês.

Para darmos o encaminhamento correto, poderiam nos informar:
• O motivo da recusa e se houve registro formal da ocorrência;
• A situação atual do resíduo e onde ele se encontra;
• Quais providências são necessárias da nossa parte;
• Como fica o registro do MTR, conforme o sistema e as regras aplicáveis.

Ficamos à disposição para alinhar o que for necessário.

""" + ASS_EMAIL,
        "dica": "Se for urgente, ligue primeiro e use este e-mail para deixar por escrito o que foi conversado.",
    },
    # ---------------- CATEGORIA 06 ----------------
    {
        "cat": "06",
        "titulo": "Cobrar documentos ao responsável interno",
        "quando": "Quando um colega de outro setor ficou de enviar um documento, como nota fiscal, ticket de pesagem ou via assinada, e ainda não enviou.",
        "para": "Colaborador ou setor interno (compras, logística, produção, portaria)",
        "canal": "WhatsApp corporativo ou e-mail",
        "canais": ["whats", "email"],
        "assunto": "Documento pendente | [NOME DO DOCUMENTO]",
        "texto": """Oi, [NOME DO COLEGA], tudo bem?

Estou fechando o controle de resíduos de [PERÍODO] e ainda falta este documento do seu setor: [NOME DO DOCUMENTO], referente a [COLETA OU MOVIMENTAÇÃO].

Você consegue me enviar até [DATA LIMITE]? Se ele estiver com outra pessoa, me avisa com quem devo falar que eu resolvo direto.

Conto com você!
[SEU NOME]""",
        "dica": "Informe o prazo de que você realmente precisa. Pedidos sem data costumam ficar para depois.",
    },
    {
        "cat": "06",
        "titulo": "Solicitar atualização do controle documental",
        "quando": "Quando a planilha ou o sistema interno de acompanhamento de resíduos está desatualizado e outra pessoa é responsável por alimentá-lo.",
        "para": "Responsável interno pelo controle (equipe ambiental, administrativo ou consultoria)",
        "canal": "E-mail ou WhatsApp",
        "canais": ["email", "whats"],
        "assunto": "Atualização do controle de resíduos | [PERÍODO]",
        "texto": """Olá, [NOME DO COLEGA], tudo bem?

Ao consultar o [NOME DA PLANILHA OU SISTEMA], percebi que algumas informações de [PERÍODO] ainda não foram atualizadas. Pelo que vi, faltam:
• [MTR OU MOVIMENTAÇÃO 1]: [INFORMAÇÃO QUE FALTA];
• [MTR OU MOVIMENTAÇÃO 2]: [INFORMAÇÃO QUE FALTA].

Você consegue verificar e atualizar esses pontos até [DATA LIMITE]? Se algum documento ainda não chegou, deixe marcado como pendente. Assim a gente sabe o que precisa ser cobrado.

Agradeço a ajuda!
[SEU NOME]""",
        "dica": "Uma marcação clara de pendente facilita as próximas cobranças e evita retrabalho na conferência.",
    },
    {
        "cat": "06",
        "titulo": "Informar pendências à gestão",
        "quando": "No fechamento do mês, antes de uma reunião ou sempre que houver pendências que precisam do conhecimento ou da decisão do gestor.",
        "para": "Gestor ambiental, coordenador ou responsável técnico",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Pendências de documentação de resíduos | [PERÍODO]",
        "texto": """Olá, [NOME DO GESTOR],

Segue o resumo das pendências de documentação de resíduos identificadas até [DATA]:

1. [PENDÊNCIA 1], com [EMPRESA ENVOLVIDA]. Situação: [SITUAÇÃO]. Último contato: [DATA].
2. [PENDÊNCIA 2], com [EMPRESA ENVOLVIDA]. Situação: [SITUAÇÃO]. Último contato: [DATA].
3. [PENDÊNCIA 3], com [EMPRESA ENVOLVIDA]. Situação: [SITUAÇÃO]. Último contato: [DATA].

Próximos passos: [O QUE SERÁ FEITO].
Ponto que precisa da sua avaliação: [DECISÃO OU APOIO NECESSÁRIO].

Sigo acompanhando e trago uma nova atualização em [DATA DA PRÓXIMA ATUALIZAÇÃO].

Atenciosamente,
[SEU NOME]""",
        "dica": "Mantenha sempre a mesma estrutura. O gestor se acostuma com o formato e lê mais rápido.",
    },
    {
        "cat": "06",
        "titulo": "Enviar resumo de documentos faltantes",
        "quando": "Quando você quer enviar a uma empresa parceira, de uma só vez, a lista de tudo o que ainda falta, sem cobrar documento por documento.",
        "para": "Transportador, destinador ou empresa parceira",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Relação de documentos pendentes | [PERÍODO]",
        "texto": """Prezado(a) [NOME DO CONTATO],

Para facilitar o acompanhamento, segue a relação dos documentos que ainda não recebemos, referentes às movimentações de [PERÍODO]:

• MTR nº [NÚMERO]: [DOCUMENTO PENDENTE];
• MTR nº [NÚMERO]: [DOCUMENTO PENDENTE];
• MTR nº [NÚMERO]: [DOCUMENTO PENDENTE].

Se algum desses documentos já tiver sido enviado, peço que me informem a data e o e-mail usado, para eu localizar aqui. Para os demais, agradeço se puderem encaminhar até [DATA LIMITE] ou informar uma previsão.

""" + ASS_EMAIL,
        "dica": "Uma lista única evita várias mensagens soltas e facilita a resposta da outra empresa.",
    },
    {
        "cat": "06",
        "titulo": "Comunicar regularização documental",
        "quando": "Depois de conferir os documentos e confirmar que a pendência foi resolvida. Serve para avisar a gestão ou as áreas envolvidas e encerrar o acompanhamento.",
        "para": "Gestor ambiental, áreas internas envolvidas ou empresa parceira",
        "canal": "E-mail",
        "canais": ["email"],
        "assunto": "Pendência regularizada | MTR nº [NÚMERO DO MTR]",
        "texto": """Olá, [NOME],

Informo que a pendência referente ao MTR nº [NÚMERO DO MTR], [DESCRIÇÃO CURTA DA PENDÊNCIA], foi regularizada.

Conferimos os seguintes documentos:
• [DOCUMENTO CONFERIDO 1];
• [DOCUMENTO CONFERIDO 2].

As informações estão de acordo com os registros da movimentação, e o controle interno foi atualizado em [DATA DA ATUALIZAÇÃO]. Com isso, o item sai da nossa lista de pendências.

Agradeço a todos que ajudaram na resolução.

Atenciosamente,
[SEU NOME]""",
        "dica": "Envie somente depois de conferir os documentos. Avisar antes da hora pode gerar retrabalho.",
    },
]

# Palavras extras para a busca (sinônimos e termos comuns)
PALAVRAS_BUSCA = {
    1: "mtr manifesto cópia documento pdf arquivo",
    2: "transportador cadastro licença veículo placa documento dados",
    3: "destinador destino unidade licença cadastro dados",
    4: "documento complementar anexo nota fiscal laudo",
    5: "comprovante movimentação período mês auditoria dmr relatório planilha",
    6: "coleta agendamento transporte data horário motorista veículo",
    7: "retirada coleta transporte portaria motorista",
    8: "recebimento destinador carga chegada transporte",
    9: "status carga transporte trânsito acompanhamento",
    10: "quantidade peso pesagem balança recebimento",
    11: "pendência mtr situação atualização sistema",
    12: "recebimento pendência mtr sistema destinador",
    13: "inconsistência divergência mtr erro correção",
    14: "dados incorretos análise correção mtr erro",
    15: "pendência acompanhamento retomar cobrança follow-up mtr",
    16: "cdf certificado destinação destinador",
    17: "cdf cobrança certificado pendência reforço",
    18: "cdf previsão certificado prazo",
    19: "cdf não localizado certificado sistema",
    20: "cdf recebimento certificado encerramento",
    21: "peso diferença quantidade pesagem divergência balança",
    22: "cadastro cnpj razão social endereço divergência",
    23: "classificação resíduo código laudo análise",
    24: "divergência documento nota fiscal ticket inconsistência",
    25: "carga recusada devolvida recusa destinador",
    26: "interno documento cobrança colega setor",
    27: "controle planilha atualização interno documento",
    28: "gestão gestor pendência relatório resumo",
    29: "documentos faltantes pendência lista resumo",
    30: "regularização regularizada pendência resolvida encerramento",
}

# Mensagens relacionadas (próximos passos comuns ou situações vizinhas)
RELACIONADAS = {
    1: [5, 29], 2: [3, 6], 3: [2, 6], 4: [29, 26], 5: [29, 1],
    6: [7, 8], 7: [8, 26], 8: [9, 12], 9: [8, 25], 10: [21, 24],
    11: [15, 14], 12: [9, 15], 13: [14, 24], 14: [13, 30], 15: [28, 11],
    16: [18, 17], 17: [19, 28], 18: [17, 16], 19: [20, 17], 20: [24, 30],
    21: [10, 24], 22: [24, 2], 23: [14, 24], 24: [13, 30], 25: [9, 28],
    26: [27, 29], 27: [28, 26], 28: [30, 29], 29: [15, 28], 30: [20, 28],
}
