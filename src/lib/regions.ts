// Country / language / region reference data. The state (or province) field
// only applies to countries that use them; regionConfig returns null otherwise,
// so the UI hides the field for countries where it makes no sense.

export const COUNTRIES: string[] = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Ireland",
  "New Zealand",
  "South Africa",
  "India",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Mexico",
  "Brazil",
];

export const LANGUAGES: string[] = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Hindi",
];

export interface RegionConfig {
  label: string; // "State" | "Province" | ...
  options: string[];
}

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

const CA_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Nova Scotia", "Ontario",
  "Prince Edward Island", "Quebec", "Saskatchewan", "Northwest Territories",
  "Nunavut", "Yukon",
];

const AU_STATES = [
  "Australian Capital Territory", "New South Wales", "Northern Territory",
  "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia",
];

const REGIONS: Record<string, RegionConfig> = {
  "United States": { label: "State", options: US_STATES },
  Canada: { label: "Province", options: CA_PROVINCES },
  Australia: { label: "State / Territory", options: AU_STATES },
};

// null => this country doesn't use a state/province field.
export function regionConfig(country: string): RegionConfig | null {
  return REGIONS[country] ?? null;
}
