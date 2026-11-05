# Instruções de distribuição

## O que entregar ao comprador

- `dist/index.html`: o aplicativo completo em um único arquivo (cerca de 175 KB). Funciona sem internet.
- `docs/GUIA-DE-USO.md`: guia curto para o estudante. Pode ser convertido em PDF antes do envio.

O arquivo não tem login, não coleta dados e não acessa nenhum servidor. Todos os cálculos rodam no aparelho de quem abre.

## Como gerar o arquivo final

```bash
cd mapaeletrica-calc
```

```bash
npm run build
```

Isso junta `src/index.html`, o CSS e os scripts em `dist/index.html`. Gere de novo sempre que alterar algo em `src/`.

## Antes de cada nova versão

```bash
npm test
```

```bash
npm run test:ui
```

```bash
npm run report
```

O primeiro testa o motor matemático. O segundo abre o aplicativo no Chromium e testa os fluxos (precisa do pacote `playwright`). O terceiro atualiza `docs/RELATORIO-PRECISAO.md`.

## Formas de entrega

1. **Arquivo direto.** Envie o `index.html` por e-mail, área de membros, Google Drive ou plataforma de produtos digitais (Hotmart, Kiwify, Eduzz etc.). O comprador baixa e abre.
2. **Compactado.** Coloque `index.html` e o guia num `.zip` chamado, por exemplo, `MapaEletrica-Calc-v1.0.zip`.
3. **Hospedagem estática (opcional).** O mesmo arquivo pode ser publicado em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel). Lembre que um link público pode ser compartilhado por quem comprou.

## Dicas para o comprador abrir no celular

- Android: baixe o arquivo, abra o app "Arquivos", toque no `index.html` e escolha o Chrome.
- iPhone: salve em "Arquivos" e toque no arquivo. Se abrir só a pré-visualização, use "Compartilhar" e "Abrir no Safari".

## Pontos de atenção comercial

- Mantenha o aviso educacional visível na página de vendas, como já aparece no aplicativo.
- Não anuncie conformidade com normas técnicas nem uso em projetos profissionais.
- Antes de vender, faça a revisão técnica descrita em `docs/REVISAO-TECNICA.md` com um profissional habilitado.
- Atualize o número da versão em `src/js/app.js` (constante `VERSION`) e em `package.json` a cada nova entrega.
