export const PRODUCT_GENDERS = ['Masculino', 'Feminino', 'Unissex'] as const;

export type ProductGender = (typeof PRODUCT_GENDERS)[number];

export function normalizeProductGender(value?: string | null): ProductGender | null {
  if (!value?.trim()) return null;

  const normalized = value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  if (tokens.some(token => ['unisex', 'unisexo', 'compartilhavel', 'shared'].includes(token))) return 'Unissex';
  if (tokens.some(token => ['feminino', 'female', 'feminine', 'women', 'woman', 'femme'].includes(token))) return 'Feminino';
  if (tokens.some(token => ['masculino', 'male', 'masculine', 'men', 'man', 'homme'].includes(token))) return 'Masculino';

  return null;
}
