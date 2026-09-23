import { useState, type InputHTMLAttributes } from 'react';
import { useBahasa } from '../lib/i18n';

/**
 * A password field with a show/hide button, so a typo can be seen instead of
 * guessed at. Takes every attribute a normal <input> takes, except `type`.
 */
export default function InputSandi(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const { t } = useBahasa();
  const [terlihat, setTerlihat] = useState(false);
  const { className = '', ...sisa } = props;

  return (
    <div className="relative">
      <input {...sisa} type={terlihat ? 'text' : 'password'} className={`input !pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setTerlihat((v) => !v)}
        aria-label={terlihat ? t('sandi.sembunyikan') : t('sandi.lihat')}
        title={terlihat ? t('sandi.sembunyikan') : t('sandi.lihat')}
        aria-pressed={terlihat}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-base text-maroon-600 transition hover:text-bata-600"
      >
        <span aria-hidden>{terlihat ? '🙈' : '👁️'}</span>
      </button>
    </div>
  );
}
