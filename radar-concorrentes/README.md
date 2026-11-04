# Radar de Concorrentes · Orbion

Plataforma pessoal que acompanha os perfis de referência no Instagram, descobre quais posts deram certo e por quê, e transforma isso em ideias e roteiros para o @alvesmarcelobr.

Roda no seu computador. Os dados ficam num arquivo local (`data/radar.json`) e só você tem acesso.

## Como rodar

Precisa do Node 20 ou mais novo instalado.

```bash
cd radar-concorrentes
```

```bash
npm install
```

```bash
npm run dev
```

Depois abra http://localhost:3000 no navegador.

## Primeiro uso

1. Vá em **Visão Geral** e clique em **Atualizar todos**. A plataforma visita o seu perfil e os 6 concorrentes, um de cada vez, com uma pausa entre eles. Leva menos de um minuto.
2. Confira o **Meu Perfil**. O briefing já veio preenchido com o seu Guia de Marca Pessoal. Ajuste o que quiser.
3. Em **Roteiros**, gere o **Guia de voz** uma vez. Depois disso, cada roteiro sai no seu jeito de falar.
4. Em **Configurações**, desligue os perfis de exemplo quando os dados reais aparecerem.

Repita o **Atualizar todos** uma vez por semana. Cada coleta traz os 12 posts mais recentes de cada perfil e a base vai crescendo.

## As abas

| Aba | O que mostra |
| --- | --- |
| Visão Geral | Ranking por engajamento, formato vencedor e os posts que mais performaram |
| Meu Perfil | Seu briefing (base de tudo) e seus números comparados com os concorrentes |
| Concorrentes | Um card por perfil: seguidores, engajamento, desempenho por formato e top posts |
| Top Posts | Ranking de posts por formato, período e perfil |
| Tendências | Formato que rende em cada perfil, palavras e hashtags dos posts que bombaram, melhor dia, tamanho de legenda |
| Ideias | Seus pilares nos concorrentes (o que ninguém fala) e a análise completa da IA com 10 ideias |
| Roteiros | Guia de voz e roteiros prontos, sugerindo Reels ou Carrossel com base no que performou |
| Métricas | Comparativo lado a lado e evolução de seguidores |
| Anúncios | Link direto da Biblioteca de Anúncios de cada perfil e o registro do que você encontrou |

## Como as métricas funcionam

O Instagram mostra para qualquer pessoa as curtidas, os comentários e as visualizações dos Reels. O alcance real de um post só o dono vê. Por isso a plataforma trabalha com o que é público e compara tudo com o tamanho do perfil:

- **Taxa de engajamento**: (curtidas + comentários) ÷ seguidores. Um perfil de 20 mil com 4% está indo melhor que um de 500 mil com 0,5%.
- **Nota do post**: interações do post ÷ média normal daquele perfil. Nota 3x quer dizer que o post rendeu 3 vezes mais do que a pessoa costuma ter. É assim que a plataforma acha "o que funcionou" sem favorecer perfil grande.
- **Alcance**: em vídeo, usa as visualizações (dado real). Em carrossel e imagem é uma estimativa, sempre marcada com `~`, calculada pela relação entre interações e visualizações nos vídeos do próprio perfil.
- **Furou a bolha**: alcance maior que o número de seguidores.

## Inteligência artificial

Funciona de dois jeitos:

1. **Copiar e colar (padrão, sem custo extra).** A plataforma monta o prompt completo com seu briefing e os dados dos concorrentes. Você copia, cola no claude.ai, e cola a resposta de volta na plataforma para ficar salva.
2. **Direto na plataforma.** Coloque uma chave da API da Anthropic no arquivo `.env.local` (modelo em `.env.example`) e reinicie. Aí é um clique só.

Os perfis de exemplo nunca entram nos prompts.

## Se o Instagram bloquear a coleta

A coleta usa o mesmo endereço público que o site do Instagram chama quando você abre um perfil. Às vezes o Instagram limita. Se aparecer aviso de limite ou de login:

1. Abra o instagram.com no Chrome, logado na sua conta.
2. Aperte F12, vá na aba **Application**, depois **Cookies** e **https://www.instagram.com**.
3. Copie o valor de `sessionid`.
4. Crie o arquivo `.env.local` na pasta do projeto com `INSTAGRAM_SESSIONID=o-valor-copiado`.
5. Reinicie a plataforma.

Também dá para adicionar posts à mão na página de cada concorrente. Serve para quando a coleta falhar ou para registrar um post antigo que bombou.

## Estrutura

```
src/
  app/            páginas (uma pasta por aba) e actions.ts (tudo que salva dados)
  components/     cards, formulários, painel da IA
  lib/
    instagram.ts  coleta pública do Instagram
    metricas.ts   cálculos (engajamento, nota, alcance, tendências)
    prompts.ts    textos enviados para a IA
    ia.ts         chamada à API do Claude
    seed.ts       briefing inicial e lista de concorrentes
    db.ts         leitura e escrita do data/radar.json
data/             seus dados (fica fora do git)
```

## Próximos passos

- YouTube com a API oficial (gratuita)
- TikTok
- Transcrição do áudio dos Reels, para a IA saber o que foi falado além da legenda
- Leitura de todas as lâminas dos carrosséis
