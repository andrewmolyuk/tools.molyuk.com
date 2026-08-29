export type CountryCode = 'US' | 'UK' | 'CA'

interface CityEntry {
  city: string
  region: string
}

interface CountryDef {
  label: string
  cities: CityEntry[]
  streetTypes: string[]
  postalCode: () => string
}

export interface Address {
  street: string
  city: string
  region: string
  postalCode: string
  country: string
}

const STREET_WORDS = [
  'Main', 'Oak', 'Maple', 'Cedar', 'Elm', 'Pine', 'Washington', 'Lake', 'Hill', 'Park',
  'Sunset', 'River', 'Highland', 'Church', 'Spring', 'Ridge', 'Meadow', 'Forest', 'Union',
  'Franklin', 'Jefferson', 'Madison', 'Willow', 'Birch', 'Chestnut', 'Walnut', 'Kings',
  'Queens', 'Mill', 'Station',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function digits(n: number): string {
  let s = ''
  for (let i = 0; i < n; i++) s += randomInt(0, 9)
  return s
}

function letters(n: number): string {
  let s = ''
  for (let i = 0; i < n; i++) s += String.fromCharCode(65 + randomInt(0, 25))
  return s
}

export const COUNTRIES: Record<CountryCode, CountryDef> = {
  US: {
    label: 'United States',
    streetTypes: ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Rd', 'Ct', 'Way', 'Pl'],
    postalCode: () => digits(5),
    cities: [
      { city: 'Springfield', region: 'IL' },
      { city: 'Columbus', region: 'OH' },
      { city: 'Austin', region: 'TX' },
      { city: 'Denver', region: 'CO' },
      { city: 'Nashville', region: 'TN' },
      { city: 'Portland', region: 'OR' },
      { city: 'Phoenix', region: 'AZ' },
      { city: 'Charlotte', region: 'NC' },
      { city: 'Seattle', region: 'WA' },
      { city: 'Boston', region: 'MA' },
      { city: 'Atlanta', region: 'GA' },
      { city: 'Minneapolis', region: 'MN' },
      { city: 'Kansas City', region: 'MO' },
      { city: 'Sacramento', region: 'CA' },
      { city: 'Orlando', region: 'FL' },
      { city: 'Pittsburgh', region: 'PA' },
      { city: 'Cleveland', region: 'OH' },
      { city: 'Milwaukee', region: 'WI' },
      { city: 'Albuquerque', region: 'NM' },
      { city: 'Tucson', region: 'AZ' },
      { city: 'Raleigh', region: 'NC' },
      { city: 'Omaha', region: 'NE' },
      { city: 'Louisville', region: 'KY' },
      { city: 'Baltimore', region: 'MD' },
      { city: 'Memphis', region: 'TN' },
      { city: 'Tulsa', region: 'OK' },
      { city: 'Fresno', region: 'CA' },
      { city: 'Mesa', region: 'AZ' },
      { city: 'Colorado Springs', region: 'CO' },
      { city: 'Virginia Beach', region: 'VA' },
    ],
  },
  UK: {
    label: 'United Kingdom',
    streetTypes: ['Street', 'Road', 'Lane', 'Avenue', 'Close', 'Way', 'Gardens', 'Court'],
    postalCode: () => {
      const outward = `${pick(['A', 'B', 'C', 'D', 'E', 'G', 'L', 'M', 'N', 'S', 'W'])}${
        Math.random() < 0.5 ? letters(1) : ''
      }${randomInt(1, 29)}`
      const inward = `${randomInt(1, 9)}${letters(2)}`
      return `${outward} ${inward}`
    },
    cities: [
      { city: 'London', region: 'England' },
      { city: 'Manchester', region: 'England' },
      { city: 'Birmingham', region: 'England' },
      { city: 'Leeds', region: 'England' },
      { city: 'Glasgow', region: 'Scotland' },
      { city: 'Liverpool', region: 'England' },
      { city: 'Bristol', region: 'England' },
      { city: 'Sheffield', region: 'England' },
      { city: 'Edinburgh', region: 'Scotland' },
      { city: 'Cardiff', region: 'Wales' },
      { city: 'Belfast', region: 'Northern Ireland' },
      { city: 'Newcastle', region: 'England' },
      { city: 'Nottingham', region: 'England' },
      { city: 'Southampton', region: 'England' },
      { city: 'Leicester', region: 'England' },
    ],
  },
  CA: {
    label: 'Canada',
    streetTypes: ['St', 'Ave', 'Blvd', 'Dr', 'Rd', 'Way', 'Crescent'],
    postalCode: () => `${letters(1)}${randomInt(0, 9)}${letters(1)} ${randomInt(0, 9)}${letters(1)}${randomInt(0, 9)}`,
    cities: [
      { city: 'Toronto', region: 'ON' },
      { city: 'Vancouver', region: 'BC' },
      { city: 'Montreal', region: 'QC' },
      { city: 'Calgary', region: 'AB' },
      { city: 'Ottawa', region: 'ON' },
      { city: 'Edmonton', region: 'AB' },
      { city: 'Winnipeg', region: 'MB' },
      { city: 'Quebec City', region: 'QC' },
      { city: 'Hamilton', region: 'ON' },
      { city: 'Halifax', region: 'NS' },
      { city: 'Victoria', region: 'BC' },
      { city: 'Saskatoon', region: 'SK' },
    ],
  },
}

export function generateAddress(countryCode: CountryCode): Address {
  const def = COUNTRIES[countryCode]
  const { city, region } = pick(def.cities)
  const street = `${randomInt(1, 9999)} ${pick(STREET_WORDS)} ${pick(def.streetTypes)}`
  return { street, city, region, postalCode: def.postalCode(), country: def.label }
}

export function formatAddressText(addr: Address): string {
  return `${addr.street}\n${addr.city}, ${addr.region} ${addr.postalCode}\n${addr.country}`
}
