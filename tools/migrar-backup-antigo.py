import json, re

with open("backup-original.json", "r", encoding="utf-8") as f:
    dados = json.load(f)

# Mapa de categorização inferida pelo nome do produto (chave normalizada)
CATEGORIAS = {
    "arroz 5kg": "Mercearia",
    "feijão carioca": "Mercearia",
    "açúcar": "Mercearia",
    "sbp": "Mercearia",
    "trigo sol": "Mercearia",
    "bom bril": "Limpeza",
    "esponja bom bril": "Limpeza",
    "milharina": "Mercearia",
    "óleo": "Mercearia",
    "leite italac": "Laticínios",
    "manteiga tourinho": "Laticínios",
    "peito de franfo seara": "Açougue/Congelados",
    "frango seara": "Açougue/Congelados",
    "coxinha frango seara": "Congelados",
    "ovo branco": "Laticínios",
    "listerine": "Higiene",
    "desodorante dove": "Higiene",
    "rexona": "Higiene",
    "palmolive": "Higiene",
    "protex": "Higiene",
    "papel higiênico dueto": "Higiene",
    "sal nota 10": "Mercearia",
    "café pilão": "Mercearia",
    "café contri": "Mercearia",
    "cereal chocolate": "Mercearia",
    "nutella pequena": "Mercearia",
    "biscoito bauduco chocolate": "Mercearia",
    "caderno": "Papelaria",
    "sabão em barra ype": "Limpeza",
    "água sanitária": "Limpeza",
    "detergente minuano": "Limpeza",
    "alho ideal": "Mercearia",
    "cebola": "Hortifruti",
    "cheetos assado": "Mercearia",
    "bife": "Açougue",
    "chettos assado": "Mercearia",
}

def normalizar(nome):
    return re.sub(r"\s+", " ", nome.strip()).lower()

itens_limpos = []
catalogo = {}

for item in dados["itens"]:
    nome_limpo = re.sub(r"\s+", " ", item["nome"].strip())
    chave = normalizar(nome_limpo)
    categoria = CATEGORIAS.get(chave, "Outros")

    item_limpo = {
        "nome": nome_limpo,
        "preco": item["preco"],
        "quantidade": item["quantidade"],
        "categoria": categoria
    }
    itens_limpos.append(item_limpo)

    if chave in catalogo:
        catalogo[chave]["vezesComprado"] += 1
        catalogo[chave]["ultimoPreco"] = item["preco"]
    else:
        catalogo[chave] = {
            "nome": nome_limpo,
            "ultimoPreco": item["preco"],
            "categoria": categoria,
            "vezesComprado": 1
        }

total = sum(i["preco"] * i["quantidade"] for i in itens_limpos)

historico_feira = {
    "data": dados.get("timestamp", ""),
    "itens": itens_limpos,
    "total": round(total, 2),
    "orcamento": dados.get("orcamento", 0)
}

estado_novo = {
    "itens": [],
    "orcamento": dados.get("orcamento", 0),
    "timestamp": dados.get("timestamp", ""),
    "catalogo": catalogo,
    "historicoFeiras": [historico_feira]
}

with open("feira-inicial.json", "w", encoding="utf-8") as f:
    json.dump(estado_novo, f, ensure_ascii=False, indent=2)

print("Total da feira migrada: R$", round(total, 2))
print("Itens no catálogo:", len(catalogo))
print("Categorias 'Outros' (revisar manualmente):")
for k, v in catalogo.items():
    if v["categoria"] == "Outros":
        print(" -", v["nome"])
