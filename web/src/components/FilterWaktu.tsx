import { useState } from 'react';
import { useBahasa } from '../lib/i18n';

/** The query values the report and work-report lists understand. WIB, inclusive. */
export interface NilaiWaktu {
  dari: string;
  sampai: string;
  jam_dari: string;
  jam_sampai: string;
}

export const WAKTU_KOSONG: NilaiWaktu = { dari: '', sampai: '', jam_dari: '', jam_sampai: '' };

type Pintasan = 'semua' | 'hari_ini' | 'kemarin' | '7_hari' | '30_hari' | 'atur';

/** Today's date on the campus clock, 'YYYY-MM-DD', whatever zone the device is in. */
function hariIniWIB(geser = 0): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000 - geser * 24 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

function rentang(p: Pintasan): Pick<NilaiWaktu, 'dari' | 'sampai'> {
  switch (p) {
    case 'hari_ini':
      return { dari: hariIniWIB(), sampai: hariIniWIB() };
    case 'kemarin':
      return { dari: hariIniWIB(1), sampai: hariIniWIB(1) };
    case '7_hari':
      return { dari: hariIniWIB(6), sampai: hariIniWIB() };
    case '30_hari':
      return { dari: hariIniWIB(29), sampai: hariIniWIB() };
    default:
      return { dari: '', sampai: '' };
  }
}

const JAM = Array.from({ length: 24 }, (_, j) => j);

/**
 * "When" for the supervisor: quick ranges for the everyday questions (today,
 * this week), exact dates when needed, and an hour window for shift checks
 * such as "what came in between 07:00 and 12:00".
 */
export default function FilterWaktu({
  nilai,
  onUbah,
}: {
  nilai: NilaiWaktu;
  onUbah: (baru: NilaiWaktu) => void;
}) {
  const { t } = useBahasa();
  const [pintasan, setPintasan] = useState<Pintasan>('semua');

  const pilihPintasan = (p: Pintasan) => {
    setPintasan(p);
    if (p !== 'atur') onUbah({ ...nilai, ...rentang(p) });
  };

  const aktif = nilai.dari || nilai.sampai || nilai.jam_dari || nilai.jam_sampai;

  return (
    <div className="kartu mt-4 space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-bold uppercase tracking-wider text-maroon-600">
          🕒 {t('waktu.filter')}
        </span>
        {(['semua', 'hari_ini', 'kemarin', '7_hari', '30_hari', 'atur'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => pilihPintasan(p)}
            aria-pressed={pintasan === p}
            className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
              pintasan === p
                ? 'bg-maroon-800 text-permukaan ring-maroon-800'
                : 'bg-permukaan text-maroon-700 ring-krem-300 hover:bg-krem-50'
            }`}
          >
            {t(`waktu.${p}`)}
          </button>
        ))}
        {aktif && (
          <button
            type="button"
            onClick={() => {
              setPintasan('semua');
              onUbah(WAKTU_KOSONG);
            }}
            className="ml-auto text-xs font-semibold text-bata-600 underline underline-offset-2"
          >
            {t('waktu.reset')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {pintasan === 'atur' && (
          <>
            <label className="text-xs text-maroon-700">
              <span className="mb-1 block font-semibold">{t('waktu.dari_tanggal')}</span>
              <input
                type="date"
                className="input !w-auto !py-1.5"
                value={nilai.dari}
                max={nilai.sampai || undefined}
                onChange={(e) => onUbah({ ...nilai, dari: e.target.value })}
              />
            </label>
            <label className="text-xs text-maroon-700">
              <span className="mb-1 block font-semibold">{t('waktu.sampai_tanggal')}</span>
              <input
                type="date"
                className="input !w-auto !py-1.5"
                value={nilai.sampai}
                min={nilai.dari || undefined}
                onChange={(e) => onUbah({ ...nilai, sampai: e.target.value })}
              />
            </label>
          </>
        )}
        <label className="text-xs text-maroon-700">
          <span className="mb-1 block font-semibold">{t('waktu.dari_jam')}</span>
          <select
            className="input !w-auto !py-1.5"
            value={nilai.jam_dari}
            onChange={(e) => onUbah({ ...nilai, jam_dari: e.target.value })}
          >
            <option value="">—</option>
            {JAM.map((j) => (
              <option key={j} value={j}>
                {String(j).padStart(2, '0')}.00
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-maroon-700">
          <span className="mb-1 block font-semibold">{t('waktu.sampai_jam')}</span>
          <select
            className="input !w-auto !py-1.5"
            value={nilai.jam_sampai}
            onChange={(e) => onUbah({ ...nilai, jam_sampai: e.target.value })}
          >
            <option value="">—</option>
            {JAM.map((j) => (
              <option key={j} value={j}>
                {String(j).padStart(2, '0')}.59
              </option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-xs text-maroon-600">WIB</span>
      </div>
    </div>
  );
}
