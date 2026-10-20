import { useNavigate } from "react-router-dom";
import { Inbox } from "lucide-react";
import { clsx } from "clsx";
import { EmptyState, PageLoader } from "./Feedback";

/**
 * A plain data table.
 *   columns: [{ key, header, render?(row), className? }]
 *   rowLink: (row) => path - the whole row opens it
 *   emptyAction: a button shown when there are no rows
 */
export const DataTable = ({ columns, rows, loading, rowLink, empty = "لا يوجد بيانات", emptyText, emptyIcon = Inbox, emptyAction, className }) => {
    const navigate = useNavigate();

    if (loading) return <PageLoader />;
    if (!rows?.length) return <EmptyState icon={emptyIcon} title={empty} text={emptyText} action={emptyAction} />;

    return (
        <div className={clsx("overflow-x-auto", className)}>
            <table className="w-full min-w-max text-sm">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-start">
                        {columns.map((column) => (
                            <th key={column.key} className={clsx("whitespace-nowrap px-4 py-3 text-start text-xs font-semibold text-slate-500", column.className)}>
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((row, i) => (
                        <tr
                            key={row.id ?? i}
                            onClick={rowLink ? () => navigate(rowLink(row)) : undefined}
                            className={clsx("transition-colors", rowLink && "cursor-pointer hover:bg-slate-50")}
                        >
                            {columns.map((column) => (
                                <td key={column.key} className={clsx("whitespace-nowrap px-4 py-3 text-slate-700", column.className)}>
                                    {column.render ? column.render(row) : row[column.key] ?? "—"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
