import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"; // 请确认路径

// 生成页码逻辑（同之前）
function generatePageNumbers(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
        range.push(i);
    }

    if (current - delta > 2) {
        rangeWithDots.push(1, "...");
    } else {
        rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < total - 1) {
        rangeWithDots.push("...", total);
    } else {
        rangeWithDots.push(total);
    }

    return rangeWithDots;
}

export function AutoPagination({ totalPage, currentPage, onPageChange }) {
    if (totalPage <= 1) return null;

    const pages = generatePageNumbers(Number(currentPage), Number(totalPage));

    const handlePageClick = (page) => {
        if (typeof page === 'number' && page !== currentPage) {
            onPageChange(page);
        }
    };

    const handlePrev = () => {
        if (currentPage > 1) onPageChange(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPage) onPageChange(currentPage + 1);
    };

    return (
        <Pagination>
            <PaginationContent>
                {/* 上一页 */}
                <PaginationItem>
                    <PaginationPrevious
                        onClick={(e) => {
                            e.preventDefault();
                            handlePrev();
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>

                {/* 页码列表 */}
                {pages.map((page, index) => (
                    <PaginationItem key={`${page}-${index}`}>
                        {page === "..." ? (
                            <PaginationEllipsis />
                        ) : (
                            <PaginationLink
                                onClick={(e) => {
                                    e.preventDefault();
                                    handlePageClick(page);
                                }}
                                isActive={page === currentPage}
                                className="cursor-pointer"
                            >
                                {page}
                            </PaginationLink>
                        )}
                    </PaginationItem>
                ))}

                {/* 下一页 */}
                <PaginationItem>
                    <PaginationNext
                        onClick={(e) => {
                            e.preventDefault();
                            handleNext();
                        }}
                        className={currentPage === totalPage ? "pointer‌​-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}