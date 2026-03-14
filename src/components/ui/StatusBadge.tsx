export const StatusBadge = ({ status, color }: { status: string, color?: string }) => {
  const colorMap: Record<string, string> = {
    azul: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ambar: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    laranja: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    esmeralda: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rosa: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    roxo: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    ciano: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    cinza: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    lime: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
    fuchsia: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  };

  // Default color logic for legacy statuses or if color is missing
  const getLegacyColor = (s: string) => {
    if (s.includes('Recebida')) return colorMap.blue;
    if (s.includes('Análise')) return colorMap.amber;
    if (s.includes('Fornecedor')) return colorMap.orange;
    if (s.includes('Concluída')) return colorMap.emerald;
    if (s.includes('Recusada')) return colorMap.rose;
    return colorMap.blue;
  };

  const currentStyles = color ? (colorMap[color] || colorMap.blue) : getLegacyColor(status);

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${currentStyles}`}>
      {status}
    </span>
  );
};
