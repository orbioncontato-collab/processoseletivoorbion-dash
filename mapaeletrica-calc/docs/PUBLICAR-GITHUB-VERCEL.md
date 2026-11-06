# Como publicar no GitHub e na Vercel

## 1. Subir para o GitHub

1. Entre em github.com e clique em **New repository**.
2. Dê um nome, por exemplo `mapaeletrica-calc`. Escolha **Private** se não quiser o código público.
3. Clique em **Create repository**.
4. Na página do repositório vazio, clique em **uploading an existing file**.
5. Arraste **todo o conteúdo** da pasta `mapaeletrica-calc` (não a pasta em si, e sim o que está dentro dela).
6. Clique em **Commit changes**.

Atenção: a pasta `.github` e os arquivos `.gitignore` começam com ponto e podem ficar ocultos no seu computador.
No Mac, aperte Cmd + Shift + . para mostrar. No Windows, marque "Itens ocultos" na aba Exibir do Explorador.
Se eles não subirem, o site funciona do mesmo jeito; só os testes automáticos do GitHub deixam de rodar.

## 2. Publicar na Vercel

1. Entre em vercel.com com a sua conta do GitHub.
2. Clique em **Add New...** e depois em **Project**.
3. Escolha o repositório `mapaeletrica-calc` e clique em **Import**.
4. Em **Framework Preset**, deixe **Other**. Não precisa mudar mais nada: o arquivo `vercel.json` já diz para rodar o build e publicar a pasta `dist`.
5. Clique em **Deploy**.

Em menos de um minuto a Vercel mostra o endereço do site, algo como `mapaeletrica-calc.vercel.app`.
Toda vez que algo novo for enviado para o GitHub, a Vercel publica a nova versão sozinha.

## 3. Conferir

- Abra o endereço e teste uma calculadora com "Carregar exemplo".
- Abra no celular também.

## Pedido pronto para o Codex

Se preferir que o Codex faça a parte técnica, abra o projeto nele e cole:

> Este repositório é o MapaElétrica Calc. Leia o AGENTS.md. Rode `node scripts/build.js` e `node --test tests/engine.test.js` e confirme que tudo passa. Depois me ajude a publicar na Vercel usando o `vercel.json` que já existe (build `node scripts/build.js`, saída `dist`). Não mude o código das calculadoras.

## Cuidado com link público

Um site público pode ser aberto por qualquer pessoa que tenha o endereço. Se você vende o produto, pense se o link será só para demonstração ou se o produto será o arquivo `index.html` entregue ao comprador.
