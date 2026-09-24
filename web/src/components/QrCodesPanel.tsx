import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { api, type Building } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { DownloadGlyph, PrintGlyph } from './Marks';

/** One sticker: one QR code per floor of one building. */
interface Sticker {
  floorId: string;
  code: string;
  buildingName: string;
  floor: number;
  url: string;
  svg: string;
}

/**
 * The QR stickers, generated in the browser and printable from here, so the
 * supervisor does not need the command-line generator to replace a lost or
 * damaged sticker.
 *
 * Each code points at `<this site>/report/<building>-<floor>`, the same target
 * as `scripts/generate-qr.mjs`. Codes are drawn from the live location list,
 * so a floor added to the database appears here without any other step.
 */
export default function QrCodesPanel() {
  const { t } = useLanguage();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api
      .locations()
      .then((r) => setBuildings(r.data))
      .catch(() => setBuildings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const origin = window.location.origin;
    const planned = buildings.flatMap((b) =>
      b.floors.map((floor) => ({
        floorId: `${b.code}-${floor}`,
        code: b.code,
        buildingName: b.name,
        floor,
        url: `${origin}/report/${b.code}-${floor}`,
      })),
    );
    // SVG stays sharp at any print size; 'M' error correction survives a scuffed sticker.
    Promise.all(
      planned.map(async (s) => ({
        ...s,
        svg: await QRCode.toString(s.url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1 }),
      })),
    ).then((done) => {
      if (!cancelled) setStickers(done);
    });
    return () => {
      cancelled = true;
    };
  }, [buildings]);

  const shown = useMemo(
    () => (filter ? stickers.filter((s) => s.code === filter) : stickers),
    [stickers, filter],
  );

  async function downloadPng(s: Sticker) {
    const dataUrl = await QRCode.toDataURL(s.url, { errorCorrectionLevel: 'M', margin: 2, width: 1024 });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr-${s.floorId}.png`;
    link.click();
  }

  return (
    <div className="mt-6">
      <p className="rounded-xl bg-permukaan px-4 py-3 text-sm leading-relaxed text-maroon-700 ring-1 ring-krem-200 print:hidden">
        {t('qr.description')}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
        <select className="input !w-auto !py-2" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">{t('qr.all_buildings')}</option>
          {buildings.map((b) => (
            <option key={b.code} value={b.code}>
              {t('common.building', { code: b.code })} · {b.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-maroon-600">{t('qr.count', { n: shown.length })}</span>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!shown.length}
          className="btn-primary ml-auto !py-2 text-sm"
        >
          <PrintGlyph />
          {t('qr.print')}
        </button>
      </div>

      {loading && <p className="mt-4 text-maroon-600 print:hidden">{t('common.loading')}</p>}
      {!loading && !shown.length && (
        <p className="card mt-4 p-10 text-center text-maroon-600 print:hidden">{t('qr.empty')}</p>
      )}

      {/* Only this sheet is printed (see .print-sheet in index.css): three stickers
          per row on A4, never split across a page break. */}
      <div className="print-sheet mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-4">
        {shown.map((s) => (
          <article
            key={s.floorId}
            className="card flex flex-col items-center p-4 text-center print:break-inside-avoid print:rounded-xl print:border-2 print:border-black print:shadow-none"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-bata-600 print:text-black">
              {t('qr.sticker_heading')}
            </p>
            <p className="mt-1 text-lg font-extrabold leading-tight text-maroon-900 print:text-black">
              {t('common.building', { code: s.code })} · {t('common.floor', { n: s.floor })}
            </p>
            <p className="text-xs text-maroon-700 print:text-black">{s.buildingName}</p>
            {/* White ground in both themes: a QR code must be dark on light to scan. */}
            <div
              className="mt-3 w-full max-w-[180px] rounded-lg bg-white p-1.5"
              // The SVG is generated locally from our own URL, not from user input.
              dangerouslySetInnerHTML={{ __html: s.svg }}
            />
            <p className="mt-2 text-xs font-semibold text-maroon-800 print:text-black">{t('qr.scan_hint')}</p>
            <p className="mt-0.5 break-all text-[10px] text-maroon-600 print:text-black">{s.url}</p>
            <button
              type="button"
              onClick={() => downloadPng(s)}
              className="btn-neutral mt-3 !px-3 !py-1.5 text-xs print:hidden"
            >
              <DownloadGlyph className="h-3.5 w-3.5" />
              {t('qr.download_png')}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
