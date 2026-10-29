import { useLanguage, type Translate } from '../lib/i18n';
import type { Place } from '../lib/places';
import Select from './Select';

/** How a place and a part read in the language of `t`: "Gedung C · Dewi Sartika", "Halaman", "Lantai 2". */
export function locationLabels(t: Translate) {
  const placeLabel = (p: Place) =>
    p.code ? [t('common.building', { code: p.code }), p.name].filter(Boolean).join(' · ') : p.name;
  const partLabel = (p: Place, value: string) =>
    value === 'whole'
      ? t(p.code ? 'location.whole_building' : 'location.whole_area')
      : value === 'yard'
        ? t('location.yard')
        : t('common.floor', { n: value });
  return { placeLabel, partLabel };
}

/** The labels in the language the visitor has chosen. */
export function useLocationLabels() {
  const { t } = useLanguage();
  return locationLabels(t);
}

/**
 * "Gedung" and "Lantai / Halaman": how every page picks a location. Picking a
 * place with a single part (Lapang Voli) picks that part too.
 */
export default function LocationSelect({
  places,
  placeKey,
  part,
  onChange,
  filter = false,
}: {
  places: Place[];
  placeKey: string;
  part: string;
  onChange: (placeKey: string, part: string) => void;
  /** As a filter the choice is optional: "all" is the answer, not a prompt to pick. */
  filter?: boolean;
}) {
  const { t } = useLanguage();
  const { placeLabel, partLabel } = useLocationLabels();
  const place = places.find((p) => p.key === placeKey) ?? null;

  function pickPlace(key: string) {
    const next = places.find((p) => p.key === key);
    onChange(key, next?.parts.length === 1 ? next.parts[0] : '');
  }

  return (
    <div className="grid grid-cols-[3fr_2fr] gap-3">
      <div className="min-w-0">
        <label htmlFor="place" className="label">
          {t('location.building')}
        </label>
        <Select
          id="place"
          className="input !px-4 !py-3 font-semibold"
          value={placeKey}
          onChange={pickPlace}
        >
          <option value="">{filter ? t('location.all_buildings') : t('location.pick_building')}</option>
          {places.map((p) => (
            <option key={p.key} value={p.key}>
              {placeLabel(p)}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-0">
        <label htmlFor="part" className="label">
          {t('location.part')}
        </label>
        <Select
          id="part"
          className="input !px-4 !py-3 font-semibold"
          value={part}
          onChange={(v) => onChange(placeKey, v)}
          disabled={!place}
        >
          <option value="">{filter ? t('location.all_parts') : t('location.pick_part')}</option>
          {place?.parts.map((value) => (
            <option key={value} value={value}>
              {partLabel(place, value)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
