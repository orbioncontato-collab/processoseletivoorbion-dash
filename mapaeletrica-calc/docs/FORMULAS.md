# Documentação das fórmulas e hipóteses

Este documento lista, para cada uma das 12 calculadoras, as fórmulas usadas, as regras de validação e as hipóteses do modelo. O código correspondente fica em `src/js/calculators.js`.

## Regras gerais

- **Unidades internas.** Todo valor digitado é convertido para a unidade base do SI antes do cálculo (Ω, V, A, W, F, H, Hz, s, J). Exemplo: 2,2 kΩ vira 2200 Ω.
- **Conversão sem erro de arredondamento.** Para prefixos decimais (k, m, µ, n, p) a conversão desloca o expoente do número em base 10. Assim 2,2 × 10³ dá exatamente 2200, sem o resíduo binário que `2.2 * 1000` produziria.
- **Arredondamento só na tela.** O valor interno nunca é arredondado. A precisão escolhida (2, 4 ou 6 casas) vale apenas para exibir.
- **Prefixo automático.** Resultados aparecem com o prefixo mais legível (0,004 A vira 4 mA) e o valor na unidade base logo abaixo.
- **Nada vira zero por engano.** Quando um número diferente de zero arredondaria para zero, ele aparece em notação científica (ex.: 4 × 10⁻³).
- **Faixa segura.** Valores convertidos para o SI precisam ficar entre 10⁻¹⁸ e 10¹⁸ em módulo (ou ser zero, quando o campo aceita zero). Fora disso o app pede para conferir a unidade.
- **Sem resultado inventado.** Se faltar um dado, o app mostra qual campo preencher e não exibe resultado.

## Leitura de números (padrão brasileiro)

| Digitado | Interpretação |
|---|---|
| `0,5` ou `0.5` | 0,5 |
| `1.234,5` | 1234,5 |
| `1.234.567` | 1234567 |
| `2,2e3` ou `4.7e-6` | notação científica |
| `1.234` ou `1.000` | **recusado por ambiguidade**: pode ser mil e duzentos ou 1,234. O app pede para escrever `1234` ou `1,234` |
| `1,234.5` | recusado (formato americano misturado) |
| `5,` | recusado (número incompleto) |

---

## 01. Lei de Ohm

- V = I × R
- I = V / R
- R = V / I
- Potência associada: P = V × I

**Validação.** Tensão e corrente não podem ser negativas (trabalha com módulos). Resistência precisa ser maior que zero. Ao calcular a resistência, a corrente precisa ser maior que zero (evita divisão por zero). Se V = 0 com I > 0, o resultado R = 0 vem com aviso de curto-circuito ideal.

**Hipóteses.** Resistor ideal e linear, em corrente contínua ou em valores RMS num circuito puramente resistivo.

## 02. Potência em corrente contínua

- Modo tensão e corrente: P = V × I (e R = V / I como valor intermediário, quando I > 0)
- Modo corrente e resistência: P = I² × R (e V = I × R)
- Modo tensão e resistência: P = V² / R (e I = V / R)

**Validação.** V e I não negativos, R maior que zero.

## 03. Energia e consumo

- E_dia (kWh) = P (W) × t (h/dia) / 1000
- E_total = E_dia × dias
- Custo = E_total × tarifa (R$/kWh), só quando a tarifa é informada

**Validação.** Uso diário entre 0 e 24 h. Potência, dias e tarifa não negativos. Tarifa opcional.

**Hipóteses.** Estimativa simplificada, sem impostos, bandeiras, iluminação pública ou custo de disponibilidade. Supõe potência constante durante todo o uso.

## 04. Associação de resistores

- Série: Req = R1 + R2 + ... + Rn
- Paralelo: 1/Req = 1/R1 + 1/R2 + ... + 1/Rn. Para dois resistores, também mostra a conferência Req = R1·R2 / (R1 + R2).

**Validação.** De 2 a 10 resistores, todos maiores que zero, com unidade própria (Ω, kΩ, MΩ).

## 05. Divisor de tensão

- Rt = R1 + R2
- I = Vin / Rt
- VR1 = Vin × R1 / Rt
- VR2 = Vin × R2 / Rt
- Conferência: VR1 + VR2 = Vin

**Validação.** R1 e R2 maiores que zero. Vin pode ser negativa (fonte invertida).

**Hipóteses.** Resistores ideais e saída sem carga.

## 06. Divisor de corrente

- I1 = Itotal × R2 / (R1 + R2)
- I2 = Itotal × R1 / (R1 + R2)
- Req = R1·R2 / (R1 + R2)
- V = Itotal × Req
- Conferência: I1 + I2 = Itotal

**Validação.** R1 e R2 maiores que zero.

## 07. Frequência, período e frequência angular

- T = 1 / f
- f = 1 / T
- ω = 2πf (rad/s)

**Validação.** f e T maiores que zero.

## 08. Reatância indutiva e capacitiva

- XL = 2πfL
- XC = 1 / (2πfC) (módulo, sempre positivo)
- Com os dois componentes: f0 = 1 / (2π√(LC))

**Validação.** f, L e C maiores que zero.

**Convenção.** O app mostra XC em módulo. Na impedância complexa o capacitor entra como ZC = −j·XC e o indutor como ZL = +j·XL.

## 09. Impedância RLC em série

- XL = 2πfL (zero no circuito RC)
- XC = 1 / (2πfC) (zero no circuito RL)
- X = XL − XC
- Z = R + jX
- |Z| = √(R² + X²)
- φ = atan2(X, R), em graus
- FP = R / |Z| = cos φ
- Com tensão: I = V / |Z|, VR = I·R, VL = I·XL, VC = I·XC, P = I²R, Q = I²X, S = V·I

**Comportamento.** X > 0: predominantemente indutivo (corrente atrasada). X < 0: predominantemente capacitivo (corrente adiantada). X = 0: resistivo (ressonância no RLC). Para evitar falso resíduo de ponto flutuante, |X| menor que 10⁻¹² × max(XL, XC) é tratado como zero.

**Validação.** R ≥ 0. L, C e f maiores que zero. Tensão opcional e não negativa.

**Caso especial.** Com R = 0 e XL = XC, |Z| = 0: o app mostra aviso de curto-circuito ideal, deixa φ e FP como indeterminados e não calcula corrente (não divide por zero).

## 10. Potência monofásica em CA

- S = V × I
- P = V × I × FP
- |Q| = S × √(1 − FP²)
- |φ| = arccos(FP)

**Convenção de sinal.** Q positivo e φ positivo para carga indutiva. Q negativo e φ negativo para carga capacitiva. Carga resistiva: Q = 0 e φ = 0.

**Validação.** FP entre 0 e 1. Carga resistiva exige FP = 1 (a interface trava o campo em 1).

**Hipóteses.** Regime senoidal, valores RMS, FP = cos φ (sem harmônicas).

## 11. Potência trifásica equilibrada

- S = √3 × VL × IL
- P = √3 × VL × IL × FP
- |Q| = S × √(1 − FP²)
- Estrela: Vfase = VL / √3, Ifase = IL
- Triângulo: Vfase = VL, Ifase = IL / √3
- Extras: Pfase = P / 3, |Zfase| = Vfase / Ifase

**Validação.** Mesmas do item 10.

**Hipóteses obrigatórias.** Sistema equilibrado, tensões e correntes RMS, condições senoidais. As expressões não valem diretamente para cargas desequilibradas.

## 12. Conversor de unidades

valor no destino = valor × (fator da origem / fator do destino)

| Grandeza | Unidades |
|---|---|
| Tensão | mV, V, kV |
| Corrente | µA, mA, A |
| Resistência | Ω, kΩ, MΩ |
| Potência ativa | mW, W, kW |
| Potência aparente | VA, kVA |
| Potência reativa | var, kvar |
| Capacitância | pF, nF, µF, F |
| Indutância | µH, mH, H |
| Frequência | Hz, kHz, MHz |
| Energia | J, Wh (3.600 J), kWh (3.600.000 J) |
| Tempo | µs, ms, s, min (60 s), h (3.600 s) |

**Regra.** A conversão só acontece dentro da mesma grandeza. A interface só oferece unidades compatíveis e o motor recusa qualquer par de grandezas diferentes.
