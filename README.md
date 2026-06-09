# 📊 Trabalho Final — Gestão Financeira

Aplicação web completa em **Flask + HTML/CSS/JS** para análise financeira gerencial.

## Módulos

| # | Módulo | Calcula |
|---|--------|---------|
| 01 | **Ciclo Operacional** | CO, CCC, NCG, Giro de Estoque, Ciclo Financeiro em R$ |
| 02 | **Análise Marginal** | A.L., C.I.M.D.R (gráfico), C.P.M, Lucro Líquido, Índices |
| 03 | **Margem de Contribuição** | MC Unit/Total, Índice %, Margem de Segurança, PE |
| 04 | **Ponto de Equilíbrio** | PE Contábil, PE Financeiro, PE Econômico (Qtd + Valor) |

Cada módulo inclui **legendas explicativas** com fórmulas e interpretação prática.

## Como rodar

```bash
git clone https://github.com/seu-usuario/trabalho-final.git
cd trabalho-final
pip install -r requirements.txt
python app.py
# Acesse: http://localhost:5000
```

## Estrutura

```
trabalho-final/
├── app.py
├── requirements.txt
├── README.md
├── templates/
│   └── index.html
└── static/
    ├── css/style.css
    └── js/main.js
```

## Fórmulas principais

```
CO  = PMRE + PMRV
CCC = CO − PMPC
NCG = (Vendas / 365) × CCC
AL  = MC Total / Lucro Operacional
MC  = Receita − Custo Variável
PE Contábil  = CF / MC Unit
PE Financeiro= (CF − Depreciação) / MC Unit
PE Econômico = (CF + Lucro Desejado) / MC Unit
```
