'use client';

import { useState } from 'react';
import styles from './catalogo.module.css';

export default function PrintButton({ disabled }: { disabled: boolean }) {
  const [preparing, setPreparing] = useState(false);

  async function printCatalog() {
    setPreparing(true);
    try {
      const photos = document.querySelectorAll<HTMLImageElement>('#catalogo-estoque img');
      await Promise.allSettled(Array.from(photos, photo => photo.decode()));
      await document.fonts.ready;
      window.print();
    } finally {
      setPreparing(false);
    }
  }

  return (
    <button type="button" className={styles.print} onClick={printCatalog} disabled={disabled || preparing}>
      {preparing ? 'Carregando fotos…' : 'Imprimir ou salvar em PDF'}
    </button>
  );
}
