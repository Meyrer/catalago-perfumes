/**
 * Utilitário de normalização de URLs de imagens.
 * 
 * - Garante que caminhos para uploads locais usem caminhos relativos (/uploads/...)
 * - Converte referências ao domínio legado (perfumes.meyrer.com) para caminhos relativos de uploads
 *   ou para o novo domínio oficial perfumio.app
 */
export function normalizeImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Uploads no domínio legado (perfumes.meyrer.com) ou novo (perfumio.app) -> relativo /uploads/...
  const uploadMatch = trimmed.match(/^(?:https?:\/\/)?(?:perfumes\.meyrer\.com|perfumio\.app)?(\/uploads\/.+)$/i);
  if (uploadMatch) {
    return uploadMatch[1];
  }

  // 2. Qualquer link que contenha /uploads/ após o domínio antigo
  if (trimmed.includes('perfumes.meyrer.com/uploads/')) {
    return trimmed.replace(/^(?:https?:\/\/)?perfumes\.meyrer\.com(?=\/uploads\/)/i, '');
  }

  // 3. Qualquer outro link para o domínio legado perfumes.meyrer.com -> perfumio.app
  if (/^(?:https?:\/\/)?perfumes\.meyrer\.com/i.test(trimmed)) {
    return trimmed.replace(/^(?:https?:\/\/)?perfumes\.meyrer\.com/i, 'https://perfumio.app');
  }

  return trimmed;
}
