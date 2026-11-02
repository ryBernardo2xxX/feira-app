import s from './Toast.module.css'

export type EstadoToast = { msg: string; desfazer?: () => unknown; on: boolean }

export default function Toast({ t, onDesfazer }: { t: EstadoToast; onDesfazer: () => void }) {
  return (
    <div role="status" aria-live="polite" className={`${s.t}${t.on ? ` ${s.on}` : ''}`}>
      <span>{t.msg}</span>
      {t.desfazer && (
        <button type="button" tabIndex={t.on ? 0 : -1} onClick={onDesfazer}>
          Desfazer
        </button>
      )}
    </div>
  )
}
