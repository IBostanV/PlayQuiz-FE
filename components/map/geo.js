// Pure helpers for the map question: which places the answer options point at, and how to
// read a glossary term's key/coordinates. No React, so they can be checked on their own.
//
// countries.json: [numericId, ISO3, name, continentCode] per country, generated once from
// mledoze/countries (https://github.com/mledoze/countries, ODbL 1.0). Numeric ids match the
// shapes in world-atlas (Natural Earth, public domain).
import COUNTRIES from './countries.json';

export const LEVELS = ['country', 'continent', 'city'];

export const CONTINENTS = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America',
};

const byNumeric = new Map(COUNTRIES.map(([numeric, iso3, name, continent]) => [numeric, { numeric, iso3, name, continent }]));
const byIso3 = new Map(COUNTRIES.map(([numeric, iso3]) => [iso3, numeric]));
const byName = new Map(COUNTRIES.map(([numeric, , name]) => [name.toLowerCase(), numeric]));

export const countryInfo = (numericId) => byNumeric.get(numericId);

// Glossary type options say which level its terms are drawn at: "map:country", "map:continent"
// or "map:city". Anything else is not a map term.
export const mapLevelOf = (typeOptions) => {
  const match = /^\s*map:(country|continent|city)\s*$/i.exec(typeOptions ?? '');
  return match ? match[1].toLowerCase() : null;
};

// A country term's key: ISO3 ("MDA"), numeric ("498") or, forgivingly, the English name.
export const countryIdOf = (key) => {
  const value = String(key ?? '').trim();
  if (/^\d{3}$/.test(value)) return byNumeric.has(value) ? value : null;
  return byIso3.get(value.toUpperCase()) ?? byName.get(value.toLowerCase()) ?? null;
};

// A continent term's key: code ("EU") or name ("Europe"; "Australia" counts as Oceania).
export const continentCodeOf = (key) => {
  const value = String(key ?? '').trim();
  const upper = value.toUpperCase();
  if (CONTINENTS[upper]) return upper;
  if (value.toLowerCase() === 'australia') return 'OC';
  return Object.keys(CONTINENTS).find(code => CONTINENTS[code].toLowerCase() === value.toLowerCase()) ?? null;
};

// A city term's options: "lat,lng" (e.g. "47.0105,28.8638"). Returns [lng, lat], the order
// d3 uses, or null when missing or out of range.
export const pointOf = (text) => {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text ?? '');
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lng, lat] : null;
};

// Where each answer option is on the map, at the given level. Options that cannot be placed
// (unknown code, no coordinates) are left out, so a bad term never breaks the whole question.
export const placeOptions = (options, level) => (options ?? []).flatMap((option) => {
  if (level === 'country') {
    const id = countryIdOf(option.glossaryKey);
    return id ? [{ ...option, placeId: id }] : [];
  }
  if (level === 'continent') {
    const code = continentCodeOf(option.glossaryKey);
    return code ? [{ ...option, placeId: code }] : [];
  }
  const point = pointOf(option.glossaryOptions);
  return point ? [{ ...option, placeId: `${option.termId}`, point }] : [];
});

export const optionLetter = (index) => String.fromCharCode(65 + index);
