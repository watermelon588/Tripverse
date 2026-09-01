export interface AuthVisualItem {
  id: string;
  name: string;
  destination: string;
  location: string;
  experience: string;
  imageSrc: string;
  objectPosition: string;
  expeditionTag: string;
  voyageTag: string;
}

/**
 * Curated Collection of High-Resolution Travel Photography Assets
 * for TripVerse Authentication, Onboarding, and Spatial Canvases.
 */
export const AUTH_VISUALS: AuthVisualItem[] = [
  {
    id: 'lisbon-bica-funicular',
    name: 'Lisbon Bica Funicular',
    destination: 'LISBON',
    location: 'BAIRRO ALTO, PORTUGAL',
    experience: 'HISTORIC BICA FUNICULAR & STEEP COBBLESTONE TRAILS',
    imageSrc: '/assets/auth/pexels-ugurcan-ozmen-61083217-28553917.jpg',
    objectPosition: 'center 40%',
    expeditionTag: 'EXPEDITION 01',
    voyageTag: 'TRIPVERSE SPATIAL VOYAGE',
  },
  {
    id: 'lisbon-tram-24',
    name: 'Lisbon Tram 24 (L. Camoes)',
    destination: 'LISBON',
    location: 'PRAÇA LUÍS DE CAMÕES, PORTUGAL',
    experience: 'SUNLIT TRAMWAYS & CLASSIC PORTUGUESE ARCHITECTURE',
    imageSrc: '/assets/auth/pexels-marceloverfe-16338751.jpg',
    objectPosition: 'center 20%',
    expeditionTag: 'EXPEDITION 02',
    voyageTag: 'TRIPVERSE SPATIAL VOYAGE',
  },
  {
    id: 'lisbon-tram-reflection',
    name: 'Lisbon Tram 28 Water Reflection',
    destination: 'LISBON',
    location: 'ALFAMA DISTRICT, PORTUGAL',
    experience: 'VINTAGE TRAM REFLECTIONS & HISTORIC STREETWAYS',
    imageSrc: '/assets/auth/pexels-hikaique-1563234.jpg',
    objectPosition: 'center 35%',
    expeditionTag: 'EXPEDITION 03',
    voyageTag: 'TRIPVERSE SPATIAL VOYAGE',
  },
  {
    id: 'lisbon-tram-cobblestone',
    name: 'Lisbon Tram 28 Cobblestone Descent',
    destination: 'LISBON',
    location: 'SANTA CATARINA, PORTUGAL',
    experience: 'COBBLESTONE BOULEVARDS & TERRACOTTA ROOFTOPS',
    imageSrc: '/assets/auth/pexels-popovkin-27401407.jpg',
    objectPosition: 'center 50%',
    expeditionTag: 'EXPEDITION 04',
    voyageTag: 'TRIPVERSE SPATIAL VOYAGE',
  },
  {
    id: 'kyoto-pagoda',
    name: 'Kyoto Yasaka Pagoda',
    destination: 'KYOTO',
    location: 'HIGASHIYAMA, JAPAN',
    experience: 'SACRED SHRINES, WOODEN PAGODAS & BAMBOO TRAILS',
    imageSrc: '/assets/auth/pexels-815774834-19259314.jpg',
    objectPosition: 'center center',
    expeditionTag: 'EXPEDITION 05',
    voyageTag: 'TRIPVERSE SPATIAL VOYAGE',
  },
  {
    id: 'porto-vintage-tram',
    name: 'Porto Vintage Streetcar',
    destination: 'PORTO',
    location: 'DOURO VALLEY, PORTUGAL',
    experience: 'HISTORIC TRAMWAYS & DOURO RIVER PANORAMAS',
    imageSrc: '/assets/auth/pexels-cruz-in-portugal-22037151.jpg',
    objectPosition: 'center 15%',
    expeditionTag: 'EXPEDITION 06',
    voyageTag: 'TRIPVERSE SPATIAL VOYAGE',
  },
  {
    id: 'amalfi-coastal-cliffs',
    name: 'Amalfi Coastal Cliffs',
    destination: 'AMALFI COAST',
    location: 'CAMPANIA, ITALY',
    experience: 'MEDITERRANEAN CLIFFS & TURQUOISE LAGOONS',
    imageSrc: '/assets/auth/pexels-lorenzomessinaph-34666834.jpg',
    objectPosition: 'center center',
    expeditionTag: 'EXPEDITION 07',
    voyageTag: 'TRIPVERSE SPATIAL VOYAGE',
  },
  {
    id: 'dolomites-alpine-peaks',
    name: 'Dolomites Alpine Peaks',
    destination: 'DOLOMITES',
    location: 'SOUTH TYROL, ITALY',
    experience: 'ALPINE RIDGELINES & EMERALD VALLEYS',
    imageSrc: '/assets/auth/pexels-zeynep-yilmaz-327514331-31922059.jpg',
    objectPosition: 'center center',
    expeditionTag: 'EXPEDITION 08',
    voyageTag: 'TRIPVERSE SPATIAL VOYAGE',
  },
];

/** Dedicated Visual for Signup Page: Lisbon Bica Funicular */
export const SIGNUP_AUTH_VISUAL: AuthVisualItem = AUTH_VISUALS[5];

/** Dedicated Visual for Login Page: Lisbon Tram 24 */
export const LOGIN_AUTH_VISUAL: AuthVisualItem = AUTH_VISUALS[4];

/** Default active visual for Auth pages */
export const DEFAULT_AUTH_VISUAL: AuthVisualItem = SIGNUP_AUTH_VISUAL;
