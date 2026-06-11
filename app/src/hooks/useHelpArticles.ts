"use client";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface HelpArticle {
  id: string;
  slug: string;
  category: string;
  title: string;
  content: string;
  sort_order: number;
}

export function useHelpArticles() {
  return useQuery({
    queryKey: ["help_articles"],
    queryFn: async (): Promise<HelpArticle[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("help_articles")
        .select("id, slug, category, title, content, sort_order")
        .eq("published", true)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60_000,
  });
}

export function useHelpArticle(slug: string) {
  return useQuery({
    queryKey: ["help_article", slug],
    queryFn: async (): Promise<HelpArticle | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("help_articles")
        .select("id, slug, category, title, content, sort_order")
        .eq("slug", slug)
        .eq("published", true)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!slug,
    staleTime: 10 * 60_000,
  });
}
