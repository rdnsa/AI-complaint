import { useCallback, useEffect, useState } from 'react';
import { api, type StaffOption } from './api';

const STORAGE_KEY = 'selected-staff';

/** The staff id remembered on this phone, or '' when none was chosen. */
export function readStoredStaff(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
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
export function useSelectedStaff() {
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [id, setId] = useState(readStoredStaff);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .staffList()
      .then((r) => setStaffList(r.data))
      .catch(() => setStaffList([]))
      .finally(() => setLoading(false));
  }, []);

  const select = useCallback((next: string) => {
    setId(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* the choice still holds for this visit */
    }
  }, []);

  const selected = staffList.find((p) => p.id === id) ?? null;
  return { staffList, selected, select, loading };
}
