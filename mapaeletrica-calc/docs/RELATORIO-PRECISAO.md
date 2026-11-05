# Relatório de precisão

Arquivo gerado automaticamente por `scripts/precision-report.js` em 2026-11-05.
Os valores da coluna "Obtido" vêm do próprio motor do aplicativo, exibidos com 6 casas decimais.

Tolerância usada: diferença absoluta de até 1 × 10⁻⁹ × max(1, |esperado|), adequada a cálculos em ponto flutuante de 64 bits.

| Ferramenta | Entradas | Esperado | Obtido | Diferença | Situação |
|---|---|---|---|---|---|
| Lei de Ohm | V=12 V, R=6 Ω | I = 2 A | 2 A | 0.0e+0 | Passou |
| Potência CC | V=24 V, I=3 A | P = 72 W | 72 W | 0.0e+0 | Passou |
| Energia | 500 W, 4 h/dia, 30 dias, R$ 0,80/kWh | 60 kWh | 60 kWh | 0.0e+0 | Passou |
| Energia | 500 W, 4 h/dia, 30 dias, R$ 0,80/kWh | R$ 48 | R$ 48,00 | 0.0e+0 | Passou |
| Resistores (série) | 10 Ω e 20 Ω | 30 Ω | 30 Ω | 0.0e+0 | Passou |
| Resistores (paralelo) | 10 Ω e 20 Ω | ≈ 6,667 Ω | 6,666667 Ω | 8.9e-16 | Passou |
| Divisor de tensão | 12 V, 1 kΩ e 2 kΩ | VR2 = 8 V | 8 V | 0.0e+0 | Passou |
| Divisor de tensão | 12 V, 1 kΩ e 2 kΩ | VR1 = 4 V | 4 V | 0.0e+0 | Passou |
| Divisor de tensão | 12 V, 1 kΩ e 2 kΩ | I = 4 mA | 4 mA (0,004 A) | 0.0e+0 | Passou |
| Divisor de corrente | 3 A, 2 Ω e 4 Ω | I1 = 2 A | 2 A | 0.0e+0 | Passou |
| Divisor de corrente | 3 A, 2 Ω e 4 Ω | I2 = 1 A | 1 A | 0.0e+0 | Passou |
| Frequência | 50 Hz | T = 0,02 s | 20 ms (0,02 s) | 0.0e+0 | Passou |
| Reatância indutiva | 60 Hz, 0,1 H | XL ≈ 37,699 Ω | 37,699112 Ω | 0.0e+0 | Passou |
| Impedância RL | R=10 Ω, L=0,1 H, f=60 Hz | \|Z\| ≈ 39,003 Ω | 39,002859 Ω | 0.0e+0 | Passou |
| Potência monofásica | 120 V, 5 A, FP=0,8 indutiva | P = 480 W | 480 W | 0.0e+0 | Passou |
| Potência monofásica | 120 V, 5 A, FP=0,8 indutiva | S = 600 VA | 600 VA | 0.0e+0 | Passou |
| Potência monofásica | 120 V, 5 A, FP=0,8 indutiva | Q = +360 var | +360 var | 5.7e-14 | Passou |
| Potência trifásica | 380 V, 10 A, FP=0,8, estrela | P ≈ 5.265,43 W | 5,265434 kW (5.265,434455 W) | 9.1e-13 | Passou |
| Conversão | 2,2 kΩ para Ω | 2.200 Ω | 2.200 Ω | 0.0e+0 | Passou |

Resultado: 19 de 19 verificações dentro da tolerância.
