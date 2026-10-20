// Downloads rows as a CSV that Excel opens with Arabic intact (UTF-8 with BOM).
//   columns: [{ header, value: (row) => string|number }]
export const downloadCsv = (filename, columns, rows) => {
    const escape = (value) => {
        const text = value === null || value === undefined ? "" : String(value);
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = [
        columns.map((column) => escape(column.header)).join(","),
        ...rows.map((row) => columns.map((column) => escape(column.value(row))).join(",")),
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
};
