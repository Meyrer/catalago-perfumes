export function toCents(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Valor monetário inválido.");
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function roundMoney(value: number): number {
  return fromCents(toCents(value));
}
