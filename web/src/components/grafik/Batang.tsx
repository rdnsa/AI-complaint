import { TINTA, TUNGGAL } from './warna';

export interface ItemBatang {
  label: string;
  nilai: number;
  warna?: string;
}

/**
 * Peringkat magnitudo: batang mendatar karena labelnya berupa teks panjang
 * (nama kategori, nama gedung) yang akan terpotong bila ditaruh di sumbu X.
 *
 * Nilainya ditulis langsung di ujung batang, jadi grafik ini tetap terbaca
 * tanpa mengandalkan warna maupun kursor.
 */
export default function Batang({ data }: { data: ItemBatang[] }) {
  if (!data.length) return null;
  const maks = Math.max(...data.map((d) => d.nilai), 1);

  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="group">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium capitalize" style={{ color: TINTA.sekunder }}>
              {d.label}
            </span>
            <span className="shrink-0 font-bold" style={{ color: TINTA.utama }}>
              {d.nilai}
            </span>
          </div>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-krem-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max((d.nilai / maks) * 100, 3)}%`,
                background: d.warna ?? TUNGGAL,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
