"use client";
import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Search, BookOpen, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHelpArticles, type HelpArticle } from "@/hooks/useHelpArticles";

export default function HelpPage() {
  const { data: articles = [], isLoading } = useHelpArticles();
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<HelpArticle | null>(null);

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

  // Auto-select first article
  const firstArticle = articles[0];
  const current = selected ?? firstArticle ?? null;

  return (
    <div className="flex h-full bg-slate-950">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={18} className="text-blue-400" />
            <h1 className="text-base font-semibold text-slate-100">Manual de ayuda</h1>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setSelected(null);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {isLoading ? (
            <div className="px-5 py-4 text-sm text-slate-500">Cargando...</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="px-5 py-4 text-sm text-slate-500">Sin resultados</div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-4">
                <div className="px-5 py-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {category}
                  </span>
                </div>
                {items.map(article => (
                  <button
                    key={article.id}
                    onClick={() => setSelected(article)}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-2 text-left transition-colors group",
                      current?.id === article.id
                        ? "bg-blue-600/20 text-blue-300 border-r-2 border-blue-500"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    )}
                  >
                    <span className="text-sm truncate">{article.title}</span>
                    <ChevronRight
                      size={13}
                      className={cn(
                        "flex-shrink-0 ml-1",
                        current?.id === article.id ? "text-blue-400" : "text-slate-700 group-hover:text-slate-500"
                      )}
                    />
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>
      </div>

      {/* Article content */}
      <div className="flex-1 overflow-y-auto">
        {current ? (
          <div className="max-w-3xl mx-auto px-10 py-8">
            <div className="mb-1 text-xs text-slate-500 uppercase tracking-wide font-semibold">
              {current.category}
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mb-6">
              {current.title}
            </h1>
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold text-slate-100 mt-8 mb-3 pb-2 border-b border-slate-800">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-slate-200 mt-5 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="text-sm text-slate-300 space-y-1.5 mb-4 ml-5 list-disc">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="text-sm text-slate-300 space-y-1.5 mb-4 ml-5 list-decimal">
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
                    <div className="overflow-x-auto mb-4 rounded-lg border border-slate-700">
                      <table className="text-sm text-slate-300 border-collapse w-full">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border-b border-slate-700 bg-slate-800/80 px-4 py-2 text-left font-semibold text-slate-200 text-xs uppercase tracking-wide">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border-b border-slate-800 px-4 py-2">{children}</td>
                  ),
                  hr: () => <hr className="border-slate-800 my-6" />,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-blue-500 pl-4 text-slate-400 italic my-4">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {current.content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600">
            <div className="text-center">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Seleccioná un artículo del panel izquierdo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
