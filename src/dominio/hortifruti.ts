const B: [string, string, string, number][] = [
  ['banana-prata', 'Banana', 'Prata', 120],
  ['banana-nanica', 'Banana', 'Nanica', 140],
  ['maca-fuji', 'Maçã', 'Fuji', 160],
  ['pera-williams', 'Pera', 'Williams', 170],
  ['laranja-pera', 'Laranja', 'Pera', 180],
  ['limao-tahiti', 'Limão', 'Tahiti', 90],
  ['manga-tommy', 'Manga', 'Tommy', 450],
  ['mamao-formosa', 'Mamão', 'Formosa', 1000],
  ['abacaxi-perola', 'Abacaxi', 'Pérola', 1500],
  ['melancia', 'Melancia', 'Comum', 5000],
  ['melao-amarelo', 'Melão', 'Amarelo', 1500],
  ['abacate-fortuna', 'Abacate', 'Fortuna', 500],
  ['tomate-comum', 'Tomate', 'Comum', 120],
  ['cebola', 'Cebola', 'Comum', 150],
  ['batata-inglesa', 'Batata', 'Inglesa', 150],
  ['cenoura', 'Cenoura', 'Comum', 100],
  ['pimentao-verde', 'Pimentão', 'Verde', 150],
  ['chuchu', 'Chuchu', 'Comum', 300],
]
export const HORTIFRUTI_BASE = B.map(([id, nome, variedade, pesoMedioG]) => ({
  id,
  nome,
  variedade,
  pesoMedioG,
}))
export const pesoKg = (g: number) => (g > 0 ? `${(g / 1000).toFixed(2)} kg` : '—')
