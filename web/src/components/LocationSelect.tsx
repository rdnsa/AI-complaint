import { useLanguage } from '../lib/i18n';
import type { Place } from '../lib/places';

/** How a place and a part read everywhere: "Gedung C · Dewi Sartika", "Halaman", "Lantai 2". */
export function useLocationLabels() {
  const { t } = useLanguage();
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

/**
 * "Gedung" and "Lantai / Halaman": how every page picks a location. Picking a
 * place with a single part (Lapang Voli) picks that part too.
 */
export default function LocationSelect({
  places,
  placeKey,
  part,
  onChange,
}: {
  places: Place[];
  placeKey: string;
  part: string;
  onChange: (placeKey: string, part: string) => void;
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
        <select
          id="place"
          className="input !px-4 !py-3 font-semibold"
          value={placeKey}
          onChange={(e) => pickPlace(e.target.value)}
        >
          <option value="">{t('location.pick_building')}</option>
          {places.map((p) => (
            <option key={p.key} value={p.key}>
              {placeLabel(p)}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <label htmlFor="part" className="label">
          {t('location.part')}
        </label>
        <select
          id="part"
          className="input !px-4 !py-3 font-semibold"
          value={part}
          onChange={(e) => onChange(placeKey, e.target.value)}
          disabled={!place}
        >
          <option value="">{t('location.pick_part')}</option>
          {place?.parts.map((value) => (
            <option key={value} value={value}>
              {partLabel(place, value)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
