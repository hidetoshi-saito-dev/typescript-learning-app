type Props = {
  onClick: () => void
  disabled: boolean
  loading: boolean
}

export function JudgeButton({ onClick, disabled, loading }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-150 ${
        disabled || loading
          ? 'cursor-not-allowed bg-zinc-700 text-zinc-400'
          : 'bg-blue-500 text-white shadow-sm shadow-blue-500/30 hover:bg-blue-400 active:scale-[0.99]'
      }`}
    >
      {loading ? '判定中...' : disabled ? '型エラーを修正してください' : '答え合わせ'}
    </button>
  )
}
