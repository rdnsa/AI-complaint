import { useCallback, useEffect, useState } from 'react';
import { api, type PetugasPilihan } from './api';

const PENYIMPANAN = 'petugas-terpilih';

/** The staff id remembered on this phone, or '' when none was chosen. */
export function bacaTersimpan(): string {
  try {
    return localStorage.getItem(PENYIMPANAN) ?? '';
  } catch {
    return '';
  }
}

/**
 * The staff member using this phone.
 *
 * Staff pick their name once and the phone remembers it, so the next QR scan
 * opens straight to their work. It is a convenience, not an identity: the
 * server checks the id against the active staff list on every action, and a
 * name the supervisor has since removed simply falls back to "not chosen".
 */
export function usePetugasTerpilih() {
  const [daftar, setDaftar] = useState<PetugasPilihan[]>([]);
  const [id, setId] = useState(bacaTersimpan);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    api
      .daftarPetugas()
      .then((r) => setDaftar(r.data))
      .catch(() => setDaftar([]))
      .finally(() => setMemuat(false));
  }, []);

  const pilih = useCallback((baru: string) => {
    setId(baru);
    try {
      if (baru) localStorage.setItem(PENYIMPANAN, baru);
      else localStorage.removeItem(PENYIMPANAN);
    } catch {
      /* the choice still holds for this visit */
    }
  }, []);

  const terpilih = daftar.find((p) => p.id === id) ?? null;
  return { daftar, terpilih, pilih, memuat };
}
