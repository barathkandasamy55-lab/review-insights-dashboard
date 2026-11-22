export interface PropertyConfig {
  slug: string;
  name: string;
  /** Short operational label used in the UI. */
  label: string;
  url: string;
}

/** The four Azzurro Hotels properties tracked by this app. */
export const PROPERTIES: PropertyConfig[] = [
  {
    slug: 'olympic-paddington',
    name: 'Olympic Hotel Paddington',
    label: 'Paddington',
    url: 'https://www.booking.com/hotel/au/olympic-paddington.html',
  },
  {
    slug: 'venus-potts-point-sydney',
    name: 'Potts Point',
    label: 'Potts Point',
    url: 'https://www.booking.com/hotel/au/venus-potts-point-sydney.html',
  },
  {
    slug: 'venus-surry-hills',
    name: 'Central Sydney',
    label: 'Central Sydney',
    url: 'https://www.booking.com/hotel/au/venus-surry-hills.html',
  },
  {
    slug: 'chateau-de-venus',
    name: 'Darling Harbour',
    label: 'Darling Harbour',
    url: 'https://www.booking.com/hotel/au/chateau-de-venus.html',
  },
];
