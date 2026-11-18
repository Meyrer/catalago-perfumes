export const stockLocationLabels = {
  sapiranga: 'Sapiranga',
  igrejinha: 'Igrejinha',
  unassigned: 'Sem local definido',
} as const;

export type StockLocation = keyof typeof stockLocationLabels;
export type CityQuantities = Record<'sapiranga' | 'igrejinha', number>;
type StockQuantities = Record<StockLocation, number>;

export function stockLocations(product: { quantidade: number; estoqueSapiranga: number; estoqueIgrejinha: number }): StockQuantities {
  return {
    sapiranga: product.estoqueSapiranga,
    igrejinha: product.estoqueIgrejinha,
    unassigned: product.quantidade - product.estoqueSapiranga - product.estoqueIgrejinha,
  };
}

export function singleStockLocation(available: StockQuantities): StockLocation | undefined {
  const locations = (Object.keys(stockLocationLabels) as StockLocation[]).filter(location => available[location] > 0);
  return locations.length === 1 ? locations[0] : undefined;
}

export function stockWithdrawal(available: StockQuantities, quantity: number, requested?: CityQuantities): CityQuantities {
  const single = singleStockLocation(available);
  const all = quantity === available.sapiranga + available.igrejinha + available.unassigned;
  const allocation = requested ?? {
    sapiranga: all ? available.sapiranga : single === 'sapiranga' ? quantity : 0,
    igrejinha: all ? available.igrejinha : single === 'igrejinha' ? quantity : 0,
  };
  if (!requested && !all && !single) throw new Error('Escolha de onde as unidades vão sair.');
  const { sapiranga, igrejinha } = allocation;
  const unassigned = quantity - sapiranga - igrejinha;
  if (![sapiranga, igrejinha, unassigned].every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('Confira a quantidade informada em cada local.');
  }
  if (sapiranga > available.sapiranga || igrejinha > available.igrejinha || unassigned > available.unassigned) {
    throw new Error('Saldo insuficiente no local selecionado. Confira a quantidade em cada cidade.');
  }
  return { sapiranga, igrejinha };
}
