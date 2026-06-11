"use client";
import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { X, Search, ChevronRight, BookOpen, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHelpArticles, type HelpArticle } from "@/hooks/useHelpArticles";

interface HelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function HelpDrawer({ open, onClose }: HelpDrawerProps) {
  const { data: articles = [], isLoading } = useHelpArticles();
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<HelpArticle | null>(null);

  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = q
      ? articles.filter(
          a =>
            a.title.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q)
        )
      : articles;

    return filtered.reduce<Record<string, HelpArticle[]>>((acc, a) => {
      (acc[a.category] ??= []).push(a);
      return acc;
    }, {});
  }, [articles, search]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            {selected && (
              <button
                onClick={() => setSelected(null)}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <BookOpen size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-slate-200">
              {selected ? selected.title : "Manual de ayuda"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        {selected ? (
          <ArticleView article={selected} />
        ) : (
          <>
            {/* Search */}
            <div className="px-4 py-3 border-b border-slate-700 flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar en el manual..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Article list */}
            <div className="flex-1 overflow-y-auto py-2">
              {isLoading ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">Cargando...</div>
              ) : Object.keys(grouped).length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  No se encontraron artículos
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-4">
                    <div className="px-4 py-1.5">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {category}
                      </span>
                    </div>
                    {items.map(article => (
                      <button
                        key={article.id}
                        onClick={() => setSelected(article)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors text-left group"
                      >
                        <span className="text-sm text-slate-300 group-hover:text-slate-100">
                          {article.title}
                        </span>
                        <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer link to full page */}
            <div className="border-t border-slate-700 px-4 py-3 flex-shrink-0">
              <a
                href="/help"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Ver manual completo →
              </a>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function ArticleView({ article }: { article: HelpArticle }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="prose prose-sm prose-invert max-w-none">
        <ReactMarkdown
          components={{
            h2: ({ children }) => (
              <h2 className="text-base font-semibold text-slate-100 mt-6 mb-2 first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-semibold text-slate-200 mt-4 mb-1">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-sm text-slate-300 leading-relaxed mb-3">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="text-sm text-slate-300 space-y-1 mb-3 ml-4 list-disc">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="text-sm text-slate-300 space-y-1 mb-3 ml-4 list-decimal">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="text-slate-100 font-semibold">{children}</strong>
            ),
            code: ({ children }) => (
              <code className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto mb-3">
                <table className="text-xs text-slate-300 border-collapse w-full">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-slate-700 bg-slate-800 px-3 py-1.5 text-left font-semibold text-slate-200">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-slate-700 px-3 py-1.5">{children}</td>
            ),
            hr: () => <hr className="border-slate-700 my-4" />,
          }}
        >
          {article.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
