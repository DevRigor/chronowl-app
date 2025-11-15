'use client'

import React from 'react'

interface DataTableProps {
  columns: Array<{
    key: string
    label: string
    render?: (value: any) => React.ReactNode
  }>
  data: any[]
}

export function DataTable({ columns, data }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-3 px-4 font-semibold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-muted/50">
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4">
                  {col.render ? col.render(row[col.key]) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
