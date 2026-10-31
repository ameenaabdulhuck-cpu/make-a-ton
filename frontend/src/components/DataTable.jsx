export default function DataTable({ columns, rows, rowKey, onRowClick, selectedKey, emptyText = 'No records found.' }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === 'right' ? 'num' : ''}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="table-empty" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          )}
          {rows.map((row) => {
            const key = rowKey(row);
            const isSelected = selectedKey !== undefined && selectedKey === key;
            return (
              <tr
                key={key}
                className={`${onRowClick ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`.trim()}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${column.primary ? 'primary-cell' : ''} ${column.align === 'right' ? 'num money' : ''}`.trim()}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
