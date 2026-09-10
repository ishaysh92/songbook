type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  resultCount: number
  searching: boolean
}

export function SearchBar({ value, onChange, resultCount, searching }: SearchBarProps) {
  return (
    <label className="search-shell">
      <span className="sr-only">חיפוש שירים</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="חפשו שיר, אומן, כותב, מלחין או מילים מתוך השיר"
        autoComplete="off"
      />
      <span className="search-meta">
        {searching ? `${resultCount} תוצאות` : `${resultCount} שירים`}
      </span>
    </label>
  )
}
