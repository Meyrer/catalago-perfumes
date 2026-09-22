import { FragranceProvider, FragranceSearchResult } from '../types';

interface CuratedFragranceItem {
  name: string;
  brand: string;
  concentration: string;
  volume: string;
  gender: string;
  year?: number;
  family?: string;
  keywords: string[];
}

const CURATED_FRAGRANCES: CuratedFragranceItem[] = [
  // Paco Rabanne / Rabanne
  { name: '1 Million', brand: 'Rabanne', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2008, family: 'Amadeirado Especiado', keywords: ['million', 'milli', '1 million', 'one million', 'paco rabanne', 'rabanne'] },
  { name: '1 Million Parfum', brand: 'Rabanne', concentration: 'Parfum / Extrait', volume: '100 ml', gender: 'Masculino', year: 2020, family: 'Couro Floral', keywords: ['million', 'milli', '1 million parfum', 'one million parfum', 'rabanne'] },
  { name: '1 Million Elixir', brand: 'Rabanne', concentration: 'Parfum / Extrait', volume: '100 ml', gender: 'Masculino', year: 2022, family: 'Âmbar Amadeirado', keywords: ['million', 'milli', '1 million elixir', 'one million elixir', 'rabanne'] },
  { name: '1 Million Royal', brand: 'Rabanne', concentration: 'Parfum / Extrait', volume: '100 ml', gender: 'Masculino', year: 2023, family: 'Âmbar Amadeirado', keywords: ['million', 'milli', '1 million royal', 'one million royal', 'rabanne'] },
  { name: 'Million Gold', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2024, family: 'Amadeirado Especiado', keywords: ['million', 'milli', 'million gold', 'rabanne'] },
  { name: 'Million Gold For Her', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '90 ml', gender: 'Feminino', year: 2024, family: 'Floral Frutado', keywords: ['million', 'milli', 'million gold for her', 'rabanne'] },
  { name: 'Lady Million', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2010, family: 'Floral Frutado', keywords: ['million', 'milli', 'lady million', 'rabanne'] },
  { name: 'Lady Million Royal', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2023, family: 'Floral Frutado', keywords: ['million', 'milli', 'lady million royal', 'rabanne'] },
  { name: 'Lady Million Fabulous', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2021, family: 'Âmbar Floral', keywords: ['million', 'milli', 'lady million fabulous', 'rabanne'] },
  { name: 'Invictus', brand: 'Rabanne', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2013, family: 'Aquático Amadeirado', keywords: ['invictus', 'invi', 'rabanne'] },
  { name: 'Invictus Victory', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2021, family: 'Âmbar Oriental', keywords: ['invictus victory', 'invi', 'rabanne'] },
  { name: 'Invictus Platinum', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2022, family: 'Amadeirado Aromático', keywords: ['invictus platinum', 'invi', 'rabanne'] },
  { name: 'Phantom', brand: 'Rabanne', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2021, family: 'Aromático Fougère', keywords: ['phantom', 'rabanne'] },
  { name: 'Fame', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2022, family: 'Floral Amadeirado', keywords: ['fame', 'rabanne'] },
  { name: 'Olympéa', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2015, family: 'Âmbar Floral', keywords: ['olympea', 'rabanne'] },
  { name: 'Black XS', brand: 'Rabanne', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2005, family: 'Âmbar Amadeirado', keywords: ['black xs', 'rabanne'] },

  // Dior
  { name: 'Sauvage', brand: 'Dior', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2015, family: 'Aromático Fougère', keywords: ['sauvage', 'sauv', 'dior', 'christian dior'] },
  { name: 'Sauvage Eau de Parfum', brand: 'Dior', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2018, family: 'Âmbar Fougère', keywords: ['sauvage edp', 'sauvage eau de parfum', 'dior'] },
  { name: 'Sauvage Parfum', brand: 'Dior', concentration: 'Parfum / Extrait', volume: '100 ml', gender: 'Masculino', year: 2019, family: 'Âmbar Fougère', keywords: ['sauvage parfum', 'dior'] },
  { name: 'Sauvage Elixir', brand: 'Dior', concentration: 'Parfum / Extrait', volume: '60 ml', gender: 'Masculino', year: 2021, family: 'Aromático Especiado', keywords: ['sauvage elixir', 'dior'] },
  { name: 'Miss Dior Eau de Parfum', brand: 'Dior', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2021, family: 'Floral', keywords: ['miss dior', 'dior'] },
  { name: 'J\'adore', brand: 'Dior', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 1999, family: 'Floral Frutado', keywords: ['jadore', 'j adore', 'dior'] },
  { name: 'Fahrenheit', brand: 'Dior', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 1988, family: 'Amadeirado Floral', keywords: ['fahrenheit', 'dior'] },
  { name: 'Dior Homme Intense', brand: 'Dior', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2011, family: 'Amadeirado Floral Almíscar', keywords: ['dior homme intense', 'dior homme'] },

  // Chanel
  { name: 'Bleu de Chanel Eau de Toilette', brand: 'Chanel', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2010, family: 'Amadeirado Aromático', keywords: ['bleu de chanel', 'bleu', 'chanel'] },
  { name: 'Bleu de Chanel Eau de Parfum', brand: 'Chanel', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2014, family: 'Amadeirado Aromático', keywords: ['bleu de chanel edp', 'bleu edp', 'chanel'] },
  { name: 'Bleu de Chanel Parfum', brand: 'Chanel', concentration: 'Parfum / Extrait', volume: '100 ml', gender: 'Masculino', year: 2018, family: 'Amadeirado Aromático', keywords: ['bleu de chanel parfum', 'chanel'] },
  { name: 'Coco Mademoiselle', brand: 'Chanel', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2001, family: 'Âmbar Floral', keywords: ['coco mademoiselle', 'coco', 'chanel'] },
  { name: 'Coco Mademoiselle Intense', brand: 'Chanel', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2018, family: 'Âmbar Amadeirado', keywords: ['coco mademoiselle intense', 'chanel'] },
  { name: 'Allure Homme Sport', brand: 'Chanel', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2004, family: 'Amadeirado Especiado', keywords: ['allure homme sport', 'allure', 'chanel'] },
  { name: 'Chance Eau Tendre', brand: 'Chanel', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2019, family: 'Floral Frutado', keywords: ['chance eau tendre', 'chance', 'chanel'] },
  { name: 'Chanel Nº 5', brand: 'Chanel', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 1986, family: 'Floral Aldeídico', keywords: ['chanel 5', 'chanel no 5', 'chanel nº 5', 'chanel'] },

  // Yves Saint Laurent
  { name: 'Libre', brand: 'Yves Saint Laurent', concentration: 'Eau de Parfum (EDP)', volume: '90 ml', gender: 'Feminino', year: 2019, family: 'Âmbar Fougère', keywords: ['libre', 'ysl', 'yves saint laurent'] },
  { name: 'Libre Intense', brand: 'Yves Saint Laurent', concentration: 'Eau de Parfum (EDP)', volume: '90 ml', gender: 'Feminino', year: 2020, family: 'Âmbar Fougère', keywords: ['libre intense', 'ysl', 'yves saint laurent'] },
  { name: 'Libre Le Parfum', brand: 'Yves Saint Laurent', concentration: 'Parfum / Extrait', volume: '90 ml', gender: 'Feminino', year: 2022, family: 'Âmbar Floral', keywords: ['libre le parfum', 'ysl'] },
  { name: 'Black Opium', brand: 'Yves Saint Laurent', concentration: 'Eau de Parfum (EDP)', volume: '90 ml', gender: 'Feminino', year: 2014, family: 'Âmbar Baunilha', keywords: ['black opium', 'opium', 'ysl'] },
  { name: 'MYSLF', brand: 'Yves Saint Laurent', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2023, family: 'Floral Amadeirado', keywords: ['myslf', 'myself', 'ysl'] },
  { name: 'Y Eau de Parfum', brand: 'Yves Saint Laurent', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2018, family: 'Aromático Fougère', keywords: ['y edp', 'y ysl', 'yves saint laurent y'] },

  // Carolina Herrera
  { name: 'Good Girl', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2016, family: 'Âmbar Floral', keywords: ['good girl', 'carolina herrera', 'ch'] },
  { name: 'Good Girl Blush', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2023, family: 'Floral', keywords: ['good girl blush', 'ch'] },
  { name: 'Very Good Girl Glam', brand: 'Carolina Herrera', concentration: 'Parfum / Extrait', volume: '80 ml', gender: 'Feminino', year: 2022, family: 'Floral Frutado', keywords: ['very good girl glam', 'good girl glam', 'ch'] },
  { name: 'Bad Boy', brand: 'Carolina Herrera', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2019, family: 'Âmbar Especiado', keywords: ['bad boy', 'ch'] },
  { name: 'Bad Boy Cobalt', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2022, family: 'Amadeirado Aromático', keywords: ['bad boy cobalt', 'ch'] },
  { name: '212 VIP Rosé', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2014, family: 'Floral Frutado', keywords: ['212 vip rose', '212 rose', 'ch'] },
  { name: '212 VIP Rosé Elixir', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2024, family: 'Floral Chipre', keywords: ['212 vip rose elixir', '212 elixir', 'ch'] },
  { name: '212 VIP Black', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2017, family: 'Aromático Fougère', keywords: ['212 vip black', '212 black', 'ch'] },
  { name: '212 Men NYC', brand: 'Carolina Herrera', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 1999, family: 'Amadeirado Floral Almíscar', keywords: ['212 men', '212 nyc', 'ch'] },

  // Jean Paul Gaultier
  { name: 'Scandal', brand: 'Jean Paul Gaultier', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2017, family: 'Chipre Floral', keywords: ['scandal', 'jean paul gaultier', 'jpg'] },
  { name: 'Scandal Pour Homme', brand: 'Jean Paul Gaultier', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2021, family: 'Âmbar Amadeirado', keywords: ['scandal pour homme', 'scandal masculino', 'jpg'] },
  { name: 'Scandal Absolu', brand: 'Jean Paul Gaultier', concentration: 'Parfum / Extrait', volume: '80 ml', gender: 'Feminino', year: 2024, family: 'Âmbar Floral', keywords: ['scandal absolu', 'jpg'] },
  { name: 'Le Male', brand: 'Jean Paul Gaultier', concentration: 'Eau de Toilette (EDT)', volume: '125 ml', gender: 'Masculino', year: 1995, family: 'Âmbar Fougère', keywords: ['le male', 'jpg'] },
  { name: 'Le Male Le Parfum', brand: 'Jean Paul Gaultier', concentration: 'Eau de Parfum (EDP)', volume: '125 ml', gender: 'Masculino', year: 2020, family: 'Âmbar Oriental', keywords: ['le male le parfum', 'jpg'] },
  { name: 'Le Male Elixir', brand: 'Jean Paul Gaultier', concentration: 'Parfum / Extrait', volume: '125 ml', gender: 'Masculino', year: 2023, family: 'Âmbar Fougère', keywords: ['le male elixir', 'jpg'] },
  { name: 'Ultra Male', brand: 'Jean Paul Gaultier', concentration: 'Eau de Toilette (EDT)', volume: '125 ml', gender: 'Masculino', year: 2015, family: 'Âmbar Fougère', keywords: ['ultra male', 'jpg'] },

  // Maison Francis Kurkdjian & Creed & Nicho
  { name: 'Baccarat Rouge 540', brand: 'Maison Francis Kurkdjian', concentration: 'Eau de Parfum (EDP)', volume: '70 ml', gender: 'Compartilhável', year: 2015, family: 'Âmbar Floral', keywords: ['baccarat', 'baccarat rouge', 'baccarat 540', 'mfk'] },
  { name: 'Baccarat Rouge 540 Extrait', brand: 'Maison Francis Kurkdjian', concentration: 'Parfum / Extrait', volume: '70 ml', gender: 'Compartilhável', year: 2017, family: 'Âmbar Floral', keywords: ['baccarat extrait', 'mfk'] },
  { name: 'Aventus', brand: 'Creed', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2010, family: 'Chipre Frutado', keywords: ['aventus', 'creed aventus', 'creed'] },
  { name: 'Silver Mountain Water', brand: 'Creed', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Compartilhável', year: 1995, family: 'Aromático', keywords: ['silver mountain water', 'creed'] },
  { name: 'Angels\' Share', brand: 'Kilian', concentration: 'Eau de Parfum (EDP)', volume: '50 ml', gender: 'Compartilhável', year: 2020, family: 'Âmbar Baunilha', keywords: ['angels share', 'angel share', 'kilian'] },
  { name: 'Delina', brand: 'Parfums de Marly', concentration: 'Eau de Parfum (EDP)', volume: '75 ml', gender: 'Feminino', year: 2017, family: 'Floral', keywords: ['delina', 'parfums de marly', 'pdm'] },
  { name: 'Layton', brand: 'Parfums de Marly', concentration: 'Eau de Parfum (EDP)', volume: '125 ml', gender: 'Compartilhável', year: 2016, family: 'Âmbar Fougère', keywords: ['layton', 'parfums de marly', 'pdm'] },

  // Tom Ford
  { name: 'Tobacco Vanille', brand: 'Tom Ford', concentration: 'Eau de Parfum (EDP)', volume: '50 ml', gender: 'Compartilhável', year: 2007, family: 'Âmbar Especiado', keywords: ['tobacco vanille', 'tom ford'] },
  { name: 'Lost Cherry', brand: 'Tom Ford', concentration: 'Eau de Parfum (EDP)', volume: '50 ml', gender: 'Compartilhável', year: 2018, family: 'Âmbar Floral', keywords: ['lost cherry', 'tom ford'] },
  { name: 'Oud Wood', brand: 'Tom Ford', concentration: 'Eau de Parfum (EDP)', volume: '50 ml', gender: 'Compartilhável', year: 2007, family: 'Amadeirado Âmbar', keywords: ['oud wood', 'tom ford'] },
  { name: 'Ombré Leather', brand: 'Tom Ford', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Compartilhável', year: 2018, family: 'Couro', keywords: ['ombre leather', 'tom ford'] },
  { name: 'Black Orchid', brand: 'Tom Ford', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Compartilhável', year: 2006, family: 'Âmbar Floral', keywords: ['black orchid', 'tom ford'] },

  // Lattafa (Perfumes Árabes)
  { name: 'Yara', brand: 'Lattafa', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2020, family: 'Âmbar Baunilha', keywords: ['yara', 'yara rosa', 'lattafa'] },
  { name: 'Yara Tous', brand: 'Lattafa', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2023, family: 'Floral Frutado', keywords: ['yara tous', 'yara amarela', 'lattafa'] },
  { name: 'Asad', brand: 'Lattafa', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2021, family: 'Âmbar', keywords: ['asad', 'lattafa'] },
  { name: 'Khamrah', brand: 'Lattafa', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Compartilhável', year: 2022, family: 'Aromático Especiado', keywords: ['khamrah', 'lattafa'] },
  { name: 'Fakhar Rose', brand: 'Lattafa', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2022, family: 'Floral', keywords: ['fakhar rose', 'fakhar', 'lattafa'] },

  // Giorgio Armani & Versace & Outros
  { name: 'Acqua Di Giò', brand: 'Giorgio Armani', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 1996, family: 'Aromático Aquático', keywords: ['acqua di gio', 'armani'] },
  { name: 'Acqua Di Giò Profondo', brand: 'Giorgio Armani', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2020, family: 'Aromático Aquático', keywords: ['profondo', 'acqua di gio profondo', 'armani'] },
  { name: 'Eros', brand: 'Versace', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2012, family: 'Aromático Fougère', keywords: ['eros', 'versace eros', 'versace'] },
  { name: 'Eros Flame', brand: 'Versace', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2018, family: 'Amadeirado Especiado', keywords: ['eros flame', 'versace'] },
  { name: 'Bright Crystal', brand: 'Versace', concentration: 'Eau de Toilette (EDT)', volume: '90 ml', gender: 'Feminino', year: 2006, family: 'Floral Frutado', keywords: ['bright crystal', 'versace'] },
  { name: 'Crystal Noir', brand: 'Versace', concentration: 'Eau de Toilette (EDT)', volume: '90 ml', gender: 'Feminino', year: 2004, family: 'Âmbar Floral', keywords: ['crystal noir', 'versace'] },
  { name: 'La Vie Est Belle', brand: 'Lancôme', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2012, family: 'Floral Frutado Gourmet', keywords: ['la vie est belle', 'lancome'] },
  { name: 'Idôle', brand: 'Lancôme', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2019, family: 'Chipre Floral', keywords: ['idole', 'lancome'] }
];

export class CuratedFragranceProvider implements FragranceProvider {
  readonly name = 'curated';

  async search(rawQuery: string, limit = 8): Promise<FragranceSearchResult[]> {
    const query = rawQuery.toLowerCase().trim();
    if (!query || query.length < 2) return [];

    const matches = CURATED_FRAGRANCES.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(query);
      const brandMatch = item.brand.toLowerCase().includes(query);
      const keywordMatch = item.keywords.some(k => k.includes(query) || query.includes(k));
      return nameMatch || brandMatch || keywordMatch;
    });

    return matches.slice(0, limit).map(item => ({
      name: item.name,
      brand: item.brand,
      concentration: item.concentration,
      volume: item.volume,
      gender: item.gender,
      year: item.year,
      family: item.family,
      topNotes: [],
      middleNotes: [],
      baseNotes: [],
      accords: [],
      source: 'manual',
      isLocal: false,
      verificationStatus: 'verified',
    }));
  }
}
