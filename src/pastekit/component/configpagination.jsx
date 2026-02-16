import React from 'react';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { generatePageNumbers } from '../utils/keyconfigutils';

/**
 * 配置分页组件
 * 处理配置列表的分页导航
 */
export default function ConfigPagination({ 
  currentPage = 1, 
  totalPages = 1, 
  onPageChange,
  totalItems = 0,
  itemsPerPage = 5
}) {
  // 如果只有一页，不显示分页控件
  if (totalPages <= 1) {
    return (
      <div className="text-center text-sm text-muted-foreground py-2">
        共 {totalItems} 个配置
      </div>
    );
  }

  const pageNumbers = generatePageNumbers(currentPage, totalPages);
  
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 分页统计信息 */}
      <div className="text-sm text-muted-foreground">
        共 {totalItems} 个配置 (第 {currentPage}/{totalPages} 页)
      </div>
      
      {/* 分页导航 */}
      <Pagination>
        <PaginationContent>
          {/* 上一页按钮 */}
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => handlePageChange(currentPage - 1)}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          
          {/* 页码按钮 */}
          {pageNumbers.map(pageNum => (
            <PaginationItem key={pageNum}>
              <PaginationLink
                onClick={() => handlePageChange(pageNum)}
                isActive={currentPage === pageNum}
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          {/* 下一页按钮 */}
          <PaginationItem>
            <PaginationNext 
              onClick={() => handlePageChange(currentPage + 1)}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}