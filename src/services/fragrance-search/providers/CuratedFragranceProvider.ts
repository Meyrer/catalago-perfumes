import { FragranceProvider, FragranceSearchResult } from '../types';

interface CuratedFragranceItem {
  name: string;
  brand: string;
  concentration: string;
  volume: string;
  gender: string;
  year?: number;
  family?: string;
  imageUrl?: string;
  keywords: string[];
}

const CURATED_FRAGRANCES: CuratedFragranceItem[] = [
  // Paco Rabanne / Rabanne
  { name: '1 Million', brand: 'Rabanne', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2008, family: 'Amadeirado Especiado', imageUrl: '/uploads/curated-rabanne-1-million.jpg', keywords: ['million', 'milli', '1 million', 'one million', 'paco rabanne', 'rabanne'] },
  { name: '1 Million Parfum', brand: 'Rabanne', concentration: 'Parfum / Extrait', volume: '100 ml', gender: 'Masculino', year: 2020, family: 'Couro Floral', imageUrl: '/uploads/curated-rabanne-1-million-parfum.png', keywords: ['million', 'milli', '1 million parfum', 'one million parfum', 'rabanne'] },
  { name: '1 Million Elixir', brand: 'Rabanne', concentration: 'Parfum / Extrait', volume: '100 ml', gender: 'Masculino', year: 2022, family: 'Âmbar Amadeirado', imageUrl: '/uploads/curated-rabanne-1-million-elixir.jpg', keywords: ['million', 'milli', '1 million elixir', 'one million elixir', 'rabanne'] },
  { name: '1 Million Royal', brand: 'Rabanne', concentration: 'Parfum / Extrait', volume: '100 ml', gender: 'Masculino', year: 2023, family: 'Âmbar Amadeirado', imageUrl: '/uploads/curated-rabanne-1-million-royal.jpg', keywords: ['million', 'milli', '1 million royal', 'one million royal', 'rabanne'] },
  { name: 'Million Gold', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2024, family: 'Amadeirado Especiado', imageUrl: '/uploads/curated-rabanne-million-gold.jpg', keywords: ['million', 'milli', 'million gold', 'rabanne'] },
  { name: 'Million Gold For Her', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '90 ml', gender: 'Feminino', year: 2024, family: 'Floral Frutado', imageUrl: '/uploads/curated-rabanne-million-gold-for-her.jpg', keywords: ['million', 'milli', 'million gold for her', 'rabanne'] },
  { name: 'Lady Million', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2010, family: 'Floral Frutado', imageUrl: '/uploads/curated-rabanne-lady-million.jpg', keywords: ['million', 'milli', 'lady million', 'rabanne'] },
  { name: 'Lady Million Royal', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2023, family: 'Floral Frutado', imageUrl: '/uploads/curated-rabanne-lady-million-royal.jpg', keywords: ['million', 'milli', 'lady million royal', 'rabanne'] },
  { name: 'Lady Million Fabulous', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2021, family: 'Âmbar Floral', imageUrl: '/uploads/curated-rabanne-lady-million-fabulous.jpg', keywords: ['million', 'milli', 'lady million fabulous', 'rabanne'] },
  { name: 'Invictus', brand: 'Rabanne', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2013, family: 'Aquático Amadeirado', imageUrl: '/uploads/original-paco-invictus-aqua-100ml.jpg', keywords: ['invictus', 'invi', 'rabanne'] },
  { name: 'Invictus Victory', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2021, family: 'Âmbar Oriental', imageUrl: '/uploads/curated-rabanne-invictus-victory.jpg', keywords: ['invictus victory', 'invi', 'rabanne'] },
  { name: 'Invictus Platinum', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2022, family: 'Amadeirado Aromático', imageUrl: '/uploads/curated-rabanne-invictus-victory.jpg', keywords: ['invictus platinum', 'invi', 'rabanne'] },
  { name: 'Phantom', brand: 'Rabanne', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2021, family: 'Aromático Fougère', imageUrl: '/uploads/curated-rabanne-phantom.jpg', keywords: ['phantom', 'rabanne'] },
  { name: 'Fame', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2022, family: 'Floral Amadeirado', imageUrl: '/uploads/curated-rabanne-olympea.png', keywords: ['fame', 'rabanne'] },
  { name: 'Olympéa', brand: 'Rabanne', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2015, family: 'Âmbar Floral', imageUrl: '/uploads/curated-rabanne-olympea.png', keywords: ['olympea', 'rabanne'] },
  { name: 'Black XS', brand: 'Rabanne', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2005, family: 'Âmbar Amadeirado', imageUrl: '/uploads/original-paco-black-xs-80ml.jpg', keywords: ['black xs', 'rabanne'] },

  // Dior
  { name: 'Sauvage', brand: 'Dior', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2015, family: 'Aromático Fougère', imageUrl: '/uploads/original-dior-sauvage-edt-100ml.jpg', keywords: ['sauvage', 'sauv', 'dior', 'christian dior'] },
  { name: 'Sauvage Eau de Parfum', brand: 'Dior', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2018, family: 'Âmbar Fougère', imageUrl: '/uploads/original-dior-sauvage-edt-100ml.jpg', keywords: ['sauvage edp', 'sauvage eau de parfum', 'dior'] },
  { name: 'Sauvage Parfum', brand: 'Dior', concentration: 'Parfum / Extrait', volume: '100 ml', gender: 'Masculino', year: 2019, family: 'Âmbar Fougère', imageUrl: '/uploads/original-dior-sauvage-edt-100ml.jpg', keywords: ['sauvage parfum', 'dior'] },
  { name: 'Sauvage Elixir', brand: 'Dior', concentration: 'Parfum / Extrait', volume: '60 ml', gender: 'Masculino', year: 2021, family: 'Aromático Especiado', imageUrl: '/uploads/curated-dior-sauvage-elixir.jpg', keywords: ['sauvage elixir', 'dior'] },
  { name: 'Miss Dior Eau de Parfum', brand: 'Dior', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2021, family: 'Floral', imageUrl: '/uploads/curated-dior-miss-dior.jpg', keywords: ['miss dior', 'dior'] },
  { name: 'J\'adore', brand: 'Dior', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 1999, family: 'Floral Frutado', imageUrl: '/uploads/curated-dior-jadore.jpg', keywords: ['jadore', 'j adore', 'dior'] },
  { name: 'Fahrenheit', brand: 'Dior', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 1988, family: 'Amadeirado Floral', imageUrl: '/uploads/mini-brand-280-dior-joy.jpg', keywords: ['fahrenheit', 'dior'] },
  { name: 'Dior Homme Intense', brand: 'Dior', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2011, family: 'Amadeirado Floral Almíscar', imageUrl: '/uploads/original-dior-sauvage-edt-100ml.jpg', keywords: ['dior homme intense', 'dior homme'] },

  // Chanel
  { name: 'Bleu de Chanel Eau de Toilette', brand: 'Chanel', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2010, family: 'Amadeirado Aromático', imageUrl: '/uploads/curated-chanel-bleu-de-chanel.jpg', keywords: ['bleu de chanel', 'bleu', 'chanel'] },
  { name: 'Bleu de Chanel Eau de Parfum', brand: 'Chanel', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2014, family: 'Amadeirado Aromático', imageUrl: '/uploads/curated-chanel-bleu-de-chanel.jpg', keywords: ['bleu de chanel edp', 'bleu edp', 'chanel'] },
  { name: 'Bleu de Chanel Parfum', brand: 'Chanel', concentration: 'Parfum / Extrait', volume: '100 ml', gender: 'Masculino', year: 2018, family: 'Amadeirado Aromático', imageUrl: '/uploads/curated-chanel-bleu-de-chanel.jpg', keywords: ['bleu de chanel parfum', 'chanel'] },
  { name: 'Coco Mademoiselle', brand: 'Chanel', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2001, family: 'Âmbar Floral', imageUrl: '/uploads/mini-brand-262-coco-mademoiselle-intense.jpg', keywords: ['coco mademoiselle', 'coco', 'chanel'] },
  { name: 'Coco Mademoiselle Intense', brand: 'Chanel', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2018, family: 'Âmbar Amadeirado', imageUrl: '/uploads/mini-brand-262-coco-mademoiselle-intense.jpg', keywords: ['coco mademoiselle intense', 'chanel'] },
  { name: 'Allure Homme Sport', brand: 'Chanel', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2004, family: 'Amadeirado Especiado', imageUrl: '/uploads/curated-chanel-bleu-de-chanel.jpg', keywords: ['allure homme sport', 'allure', 'chanel'] },
  { name: 'Chance Eau Tendre', brand: 'Chanel', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2019, family: 'Floral Frutado', imageUrl: '/uploads/mini-brand-301-chanel-chance-tendre.jpg', keywords: ['chance eau tendre', 'chance', 'chanel'] },
  { name: 'Chanel Nº 5', brand: 'Chanel', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 1986, family: 'Floral Aldeídico', imageUrl: '/uploads/mini-brand-301-chanel-chance-tendre.jpg', keywords: ['chanel 5', 'chanel no 5', 'chanel nº 5', 'chanel'] },

  // Yves Saint Laurent
  { name: 'Libre', brand: 'Yves Saint Laurent', concentration: 'Eau de Parfum (EDP)', volume: '90 ml', gender: 'Feminino', year: 2019, family: 'Âmbar Fougère', imageUrl: '/uploads/mini-brand-274-ysl-libre.jpg', keywords: ['libre', 'ysl', 'yves saint laurent'] },
  { name: 'Libre Intense', brand: 'Yves Saint Laurent', concentration: 'Eau de Parfum (EDP)', volume: '90 ml', gender: 'Feminino', year: 2020, family: 'Âmbar Fougère', imageUrl: '/uploads/mini-brand-274-ysl-libre.jpg', keywords: ['libre intense', 'ysl', 'yves saint laurent'] },
  { name: 'Libre Le Parfum', brand: 'Yves Saint Laurent', concentration: 'Parfum / Extrait', volume: '90 ml', gender: 'Feminino', year: 2022, family: 'Âmbar Floral', imageUrl: '/uploads/original-ysl-libre-le-parfum-90ml.jpg', keywords: ['libre le parfum', 'ysl'] },
  { name: 'Black Opium', brand: 'Yves Saint Laurent', concentration: 'Eau de Parfum (EDP)', volume: '90 ml', gender: 'Feminino', year: 2014, family: 'Âmbar Baunilha', imageUrl: '/uploads/curated-ysl-black-opium.jpg', keywords: ['black opium', 'opium', 'ysl'] },
  { name: 'MYSLF', brand: 'Yves Saint Laurent', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2023, family: 'Floral Amadeirado', imageUrl: '/uploads/curated-ysl-myslf.jpg', keywords: ['myslf', 'myself', 'ysl'] },
  { name: 'Y Eau de Parfum', brand: 'Yves Saint Laurent', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2018, family: 'Aromático Fougère', imageUrl: '/uploads/curated-ysl-y-edp.jpg', keywords: ['y edp', 'y ysl', 'yves saint laurent y'] },

  // Carolina Herrera
  { name: 'Good Girl', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2016, family: 'Âmbar Floral', imageUrl: '/uploads/curated-ch-good-girl.jpg', keywords: ['good girl', 'carolina herrera', 'ch'] },
  { name: 'Good Girl Blush', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2023, family: 'Floral', imageUrl: '/uploads/curated-ch-good-girl-blush.jpg', keywords: ['good girl blush', 'ch'] },
  { name: 'Very Good Girl Glam', brand: 'Carolina Herrera', concentration: 'Parfum / Extrait', volume: '80 ml', gender: 'Feminino', year: 2022, family: 'Floral Frutado', imageUrl: '/uploads/original-ch-good-girl-glam-80ml.jpg', keywords: ['very good girl glam', 'good girl glam', 'ch'] },
  { name: 'Bad Boy', brand: 'Carolina Herrera', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2019, family: 'Âmbar Especiado', imageUrl: '/uploads/curated-ch-bad-boy.jpg', keywords: ['bad boy', 'ch'] },
  { name: 'Bad Boy Cobalt', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2022, family: 'Amadeirado Aromático', imageUrl: '/uploads/curated-ch-bad-boy-cobalt.png', keywords: ['bad boy cobalt', 'ch'] },
  { name: '212 VIP Rosé', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2014, family: 'Floral Frutado', imageUrl: '/uploads/mini-brand-321-ch-212-vip-rose.jpg', keywords: ['212 vip rose', '212 rose', 'ch'] },
  { name: '212 VIP Rosé Elixir', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2024, family: 'Floral Chipre', imageUrl: '/uploads/original-ch-212-vip-rose-elixir-80ml.jpg', keywords: ['212 vip rose elixir', '212 elixir', 'ch'] },
  { name: '212 VIP Black', brand: 'Carolina Herrera', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2017, family: 'Aromático Fougère', imageUrl: '/uploads/curated-ch-212-vip-black.jpg', keywords: ['212 vip black', '212 black', 'ch'] },
  { name: '212 Men NYC', brand: 'Carolina Herrera', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 1999, family: 'Amadeirado Floral Almíscar', imageUrl: '/uploads/curated-ch-212-men-nyc.jpg', keywords: ['212 men', '212 nyc', 'ch'] },

  // Jean Paul Gaultier
  { name: 'Scandal', brand: 'Jean Paul Gaultier', concentration: 'Eau de Parfum (EDP)', volume: '80 ml', gender: 'Feminino', year: 2017, family: 'Chipre Floral', imageUrl: '/uploads/mini-brand-350-jean-paul-gaultier-scandal.jpg', keywords: ['scandal', 'jean paul gaultier', 'jpg'] },
  { name: 'Scandal Pour Homme', brand: 'Jean Paul Gaultier', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2021, family: 'Âmbar Amadeirado', imageUrl: '/uploads/mini-brand-350-jean-paul-gaultier-scandal.jpg', keywords: ['scandal pour homme', 'scandal masculino', 'jpg'] },
  { name: 'Scandal Absolu', brand: 'Jean Paul Gaultier', concentration: 'Parfum / Extrait', volume: '80 ml', gender: 'Feminino', year: 2024, family: 'Âmbar Floral', imageUrl: '/uploads/original-jpg-scandal-absolu-80ml.jpg', keywords: ['scandal absolu', 'jpg'] },
  { name: 'Le Male', brand: 'Jean Paul Gaultier', concentration: 'Eau de Toilette (EDT)', volume: '125 ml', gender: 'Masculino', year: 1995, family: 'Âmbar Fougère', imageUrl: '/uploads/curated-jpg-le-male-le-parfum.jpg', keywords: ['le male', 'jpg'] },
  { name: 'Le Male Le Parfum', brand: 'Jean Paul Gaultier', concentration: 'Eau de Parfum (EDP)', volume: '125 ml', gender: 'Masculino', year: 2020, family: 'Âmbar Oriental', imageUrl: '/uploads/curated-jpg-le-male-le-parfum.jpg', keywords: ['le male le parfum', 'jpg'] },
  { name: 'Le Male Elixir', brand: 'Jean Paul Gaultier', concentration: 'Parfum / Extrait', volume: '125 ml', gender: 'Masculino', year: 2023, family: 'Âmbar Fougère', imageUrl: '/uploads/curated-jpg-le-male-elixir.jpg', keywords: ['le male elixir', 'jpg'] },
  { name: 'Ultra Male', brand: 'Jean Paul Gaultier', concentration: 'Eau de Toilette (EDT)', volume: '125 ml', gender: 'Masculino', year: 2015, family: 'Âmbar Fougère', imageUrl: '/uploads/curated-jpg-le-male-elixir.jpg', keywords: ['ultra male', 'jpg'] },

  // Maison Francis Kurkdjian & Creed & Nicho
  { name: 'Baccarat Rouge 540', brand: 'Maison Francis Kurkdjian', concentration: 'Eau de Parfum (EDP)', volume: '70 ml', gender: 'Compartilhável', year: 2015, family: 'Âmbar Floral', imageUrl: '/uploads/curated-mfk-baccarat-rouge-540.jpg', keywords: ['baccarat', 'baccarat rouge', 'baccarat 540', 'mfk'] },
  { name: 'Baccarat Rouge 540 Extrait', brand: 'Maison Francis Kurkdjian', concentration: 'Parfum / Extrait', volume: '70 ml', gender: 'Compartilhável', year: 2017, family: 'Âmbar Floral', imageUrl: '/uploads/curated-mfk-baccarat-rouge-540.jpg', keywords: ['baccarat extrait', 'mfk'] },
  { name: 'Aventus', brand: 'Creed', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2010, family: 'Chipre Frutado', imageUrl: '/uploads/curated-creed-aventus.jpg', keywords: ['aventus', 'creed aventus', 'creed'] },
  { name: 'Silver Mountain Water', brand: 'Creed', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Compartilhável', year: 1995, family: 'Aromático', imageUrl: '/uploads/curated-creed-aventus.jpg', keywords: ['silver mountain water', 'creed'] },
  { name: 'Angels\' Share', brand: 'Kilian', concentration: 'Eau de Parfum (EDP)', volume: '50 ml', gender: 'Compartilhável', year: 2020, family: 'Âmbar Baunilha', imageUrl: '/uploads/lattafa-khamrah-qahwa-eau-de-parfum.jpg', keywords: ['angels share', 'angel share', 'kilian'] },
  { name: 'Delina', brand: 'Parfums de Marly', concentration: 'Eau de Parfum (EDP)', volume: '75 ml', gender: 'Feminino', year: 2017, family: 'Floral', imageUrl: '/uploads/curated-pdm-delina.png', keywords: ['delina', 'parfums de marly', 'pdm'] },
  { name: 'Layton', brand: 'Parfums de Marly', concentration: 'Eau de Parfum (EDP)', volume: '125 ml', gender: 'Compartilhável', year: 2016, family: 'Âmbar Fougère', imageUrl: '/uploads/curated-creed-aventus.jpg', keywords: ['layton', 'parfums de marly', 'pdm'] },

  // Tom Ford
  { name: 'Tobacco Vanille', brand: 'Tom Ford', concentration: 'Eau de Parfum (EDP)', volume: '50 ml', gender: 'Compartilhável', year: 2007, family: 'Âmbar Especiado', imageUrl: '/uploads/mini-brand-288-tom-ford-tobacco-vanille.jpg', keywords: ['tobacco vanille', 'tom ford'] },
  { name: 'Lost Cherry', brand: 'Tom Ford', concentration: 'Eau de Parfum (EDP)', volume: '50 ml', gender: 'Compartilhável', year: 2018, family: 'Âmbar Floral', imageUrl: '/uploads/mini-brand-288-tom-ford-tobacco-vanille.jpg', keywords: ['lost cherry', 'tom ford'] },
  { name: 'Oud Wood', brand: 'Tom Ford', concentration: 'Eau de Parfum (EDP)', volume: '50 ml', gender: 'Compartilhável', year: 2007, family: 'Amadeirado Âmbar', imageUrl: '/uploads/mini-brand-308-tom-ford-black-orchid.jpg', keywords: ['oud wood', 'tom ford'] },
  { name: 'Ombré Leather', brand: 'Tom Ford', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Compartilhável', year: 2018, family: 'Couro', imageUrl: '/uploads/mini-brand-308-tom-ford-black-orchid.jpg', keywords: ['ombre leather', 'tom ford'] },
  { name: 'Black Orchid', brand: 'Tom Ford', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Compartilhável', year: 2006, family: 'Âmbar Floral', imageUrl: '/uploads/mini-brand-308-tom-ford-black-orchid.jpg', keywords: ['black orchid', 'tom ford'] },

  // Lattafa (Perfumes Árabes)
  { name: 'Yara', brand: 'Lattafa', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2020, family: 'Âmbar Baunilha', imageUrl: '/uploads/lattafa-yara-elixir.jpg', keywords: ['yara', 'yara rosa', 'lattafa'] },
  { name: 'Yara Tous', brand: 'Lattafa', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2023, family: 'Floral Frutado', imageUrl: '/uploads/lattafa-yara-tous-amarelo.png', keywords: ['yara tous', 'yara amarela', 'lattafa'] },
  { name: 'Asad', brand: 'Lattafa', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2021, family: 'Âmbar', imageUrl: '/uploads/lattafa-asad-eau-de-parfum.jpg', keywords: ['asad', 'lattafa'] },
  { name: 'Khamrah', brand: 'Lattafa', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Compartilhável', year: 2022, family: 'Aromático Especiado', imageUrl: '/uploads/lattafa-khamrah-qahwa-eau-de-parfum.jpg', keywords: ['khamrah', 'lattafa'] },
  { name: 'Fakhar Rose', brand: 'Lattafa', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2022, family: 'Floral', imageUrl: '/uploads/lattafa-fakhar-rose-gold-100ml.png', keywords: ['fakhar rose', 'fakhar', 'lattafa'] },

  // Giorgio Armani & Versace & Outros
  { name: 'Acqua Di Giò', brand: 'Giorgio Armani', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 1996, family: 'Aromático Aquático', imageUrl: '/uploads/curated-armani-acqua-di-gio.jpg', keywords: ['acqua di gio', 'armani'] },
  { name: 'Acqua Di Giò Profondo', brand: 'Giorgio Armani', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2020, family: 'Aromático Aquático', imageUrl: '/uploads/curated-armani-acqua-di-gio.jpg', keywords: ['profondo', 'acqua di gio profondo', 'armani'] },
  { name: 'Eros', brand: 'Versace', concentration: 'Eau de Toilette (EDT)', volume: '100 ml', gender: 'Masculino', year: 2012, family: 'Aromático Fougère', imageUrl: '/uploads/curated-versace-eros.jpg', keywords: ['eros', 'versace eros', 'versace'] },
  { name: 'Eros Flame', brand: 'Versace', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Masculino', year: 2018, family: 'Amadeirado Especiado', imageUrl: '/uploads/curated-versace-eros.jpg', keywords: ['eros flame', 'versace'] },
  { name: 'Bright Crystal', brand: 'Versace', concentration: 'Eau de Toilette (EDT)', volume: '90 ml', gender: 'Feminino', year: 2006, family: 'Floral Frutado', imageUrl: '/uploads/original-versace-bright-crystal-90ml.jpg', keywords: ['bright crystal', 'versace'] },
  { name: 'Crystal Noir', brand: 'Versace', concentration: 'Eau de Toilette (EDT)', volume: '90 ml', gender: 'Feminino', year: 2004, family: 'Âmbar Floral', imageUrl: '/uploads/original-versace-crystal-noir-90ml.jpg', keywords: ['crystal noir', 'versace'] },
  { name: 'La Vie Est Belle', brand: 'Lancôme', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2012, family: 'Floral Frutado Gourmet', imageUrl: '/uploads/original-lancome-la-vie-est-belle-iris-100ml.jpg', keywords: ['la vie est belle', 'lancome'] },
  { name: 'Idôle', brand: 'Lancôme', concentration: 'Eau de Parfum (EDP)', volume: '100 ml', gender: 'Feminino', year: 2019, family: 'Chipre Floral', imageUrl: '/uploads/original-lancome-la-vie-est-belle-iris-100ml.jpg', keywords: ['idole', 'lancome'] }
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
      imageUrl: item.imageUrl || undefined,
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
