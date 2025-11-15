export function generateCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map((row) => {
      return headers
        .map((header) => {
          const cell = row[header]
          return typeof cell === 'string' ? `"${cell}"` : cell
        })
        .join(',')
    }),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}
