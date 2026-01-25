import React from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationConfig {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface KeywordPaginationProps {
  pagination: PaginationConfig;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const KeywordPagination: React.FC<KeywordPaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  isDarkTheme,
  uiLanguage,
}) => {
  const { currentPage, pageSize, totalItems, totalPages } = pagination;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      {/* Items Info */}
      <div className={cn('text-sm font-medium', isDarkTheme ? 'text-zinc-400' : 'text-gray-600')}>
        {uiLanguage === 'zh'
          ? `显示 ${startItem}-${endItem} / 共 ${totalItems} 个关键词`
          : `Showing ${startItem}-${endItem} of ${totalItems} keywords`}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        {/* Page Size Selector */}
        <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(parseInt(value))}>
          <SelectTrigger className={cn('w-[100px] h-8 text-xs font-medium', isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25 / {uiLanguage === 'zh' ? '页' : 'page'}</SelectItem>
            <SelectItem value="50">50 / {uiLanguage === 'zh' ? '页' : 'page'}</SelectItem>
            <SelectItem value="100">100 / {uiLanguage === 'zh' ? '页' : 'page'}</SelectItem>
            <SelectItem value="200">200 / {uiLanguage === 'zh' ? '页' : 'page'}</SelectItem>
          </SelectContent>
        </Select>

        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn('h-8 px-3 font-medium', isDarkTheme ? 'border-zinc-800' : 'border-gray-200')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className={cn('px-2 text-sm', isDarkTheme ? 'text-zinc-600' : 'text-gray-400')}>
                  ...
                </span>
              );
            }

            return (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className={cn(
                  'h-8 w-8 p-0 font-medium',
                  currentPage === page
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : isDarkTheme
                    ? 'border-zinc-800 hover:bg-zinc-800'
                    : 'border-gray-200 hover:bg-gray-100'
                )}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn('h-8 px-3 font-medium', isDarkTheme ? 'border-zinc-800' : 'border-gray-200')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
