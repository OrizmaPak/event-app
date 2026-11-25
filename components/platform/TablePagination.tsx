"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export const PLATFORM_PAGE_SIZE = 10;

export function TablePagination({ count, page, onPageChange, label }: { count: number; page: number; onPageChange: (page: number) => void; label: string }) {
  const pageCount = Math.max(1, Math.ceil(count / PLATFORM_PAGE_SIZE));
  const start = count ? (page - 1) * PLATFORM_PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PLATFORM_PAGE_SIZE, count);
  return <footer className="platform-pagination"><span>{count ? `${start}–${end} of ${count} ${label}` : `0 ${label}`}</span><div><button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={16} /></button><b>Page {page} of {pageCount}</b><button type="button" aria-label="Next page" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}><ChevronRight size={16} /></button></div></footer>;
}
