import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

type Layout = 'grid' | 'list';

export interface DeptPageInfo {
  dept: string;
  count: number;
}

interface AutoFitResult {
  layout: Layout;
  currentPage: number;
  totalPages: number;
  /** Which department to show on this page */
  currentDept: string;
  /** [start, end) slice within that department's patients */
  deptRange: [number, number];
  /** Total patient count for the current department (for badge) */
  deptTotal: number;
}

// Height estimates per card row for each layout (list: 145 = ~130px card + ~10px gap + ~5px buffer)
const ROW_HEIGHTS: Record<Layout, number> = { grid: 300, list: 145 };
// Min column widths per layout
const COL_WIDTHS: Record<Layout, number> = { grid: 340, list: Infinity };
// Chrome: header + footer + page indicator + padding
const CHROME_HEIGHT = 220;
// Only 1 department header per page now (more room for cards!)
const DEPT_HEADER_HEIGHT = 90;
// Auto-rotate interval: 10 seconds
const PAGE_INTERVAL = 10_000;

/** A single page in the rotation sequence */
interface PageSlice {
  dept: string;
  start: number;
  end: number;
  deptTotal: number;
}

/**
 * Department-per-page pagination.
 *
 * Instead of cramming multiple departments onto one page,
 * each page shows only ONE department's patients.
 * The rotation goes: Dept A page 1 → Dept A page 2 → Dept B page 1 → etc.
 *
 * Since there's only 1 department header per page (instead of up to 3),
 * more vertical space is available for cards.
 */
export function useAutoFitDisplay(
  departments: DeptPageInfo[],
  layoutOverride?: Layout | null,
): AutoFitResult {
  const defaultResult: AutoFitResult = {
    layout: layoutOverride ?? 'grid',
    currentPage: 0,
    totalPages: 1,
    currentDept: departments[0]?.dept ?? '',
    deptRange: [0, departments[0]?.count ?? 0],
    deptTotal: departments[0]?.count ?? 0,
  };

  const [result, setResult] = useState<AutoFitResult>(defaultResult);
  const currentPageRef = useRef(0);

  // Stabilize departments so calculate doesn't recreate every render.
  // The tick (elapsed timer) causes re-renders every second, producing a
  // new array reference even though the content hasn't changed.
  const depsKey = JSON.stringify(departments);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDepts = useMemo(() => departments, [depsKey]);

  const calculate = useCallback(
    (page: number): AutoFitResult => {
      if (stableDepts.length === 0) {
        return {
          layout: layoutOverride ?? 'grid',
          currentPage: 0,
          totalPages: 0,
          currentDept: '',
          deptRange: [0, 0],
          deptTotal: 0,
        };
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const layout: Layout = layoutOverride ?? 'grid';
      const isMobile = vw < 480;

      // On mobile the header wraps to 2 rows, so chrome is taller
      const chromeHeight = isMobile ? 280 : CHROME_HEIGHT;
      // Only 1 dept header per page — that's the key difference
      const available = vh - chromeHeight - DEPT_HEADER_HEIGHT;

      // On phones, use a smaller min column width so cards fit
      const colWidth = isMobile ? 280 : COL_WIDTHS[layout];
      const cols =
        layout === 'list' ? 1 : Math.max(1, Math.floor(vw / colWidth));
      const rowHeight = ROW_HEIGHTS[layout];
      const rows = available > 0 ? Math.max(1, Math.floor(available / rowHeight)) : 1;
      const cardsPerPage = cols * rows;

      // Build a flat list of pages: each page = one slice of one department
      const pages: PageSlice[] = [];
      for (const { dept, count } of stableDepts) {
        const deptPages = Math.max(1, Math.ceil(count / cardsPerPage));
        for (let p = 0; p < deptPages; p++) {
          const start = p * cardsPerPage;
          const end = Math.min(start + cardsPerPage, count);
          pages.push({ dept, start, end, deptTotal: count });
        }
      }

      const totalPages = pages.length;
      const safePage = Math.min(page, totalPages - 1);
      const current = pages[safePage];

      return {
        layout,
        currentPage: safePage,
        totalPages,
        currentDept: current.dept,
        deptRange: [current.start, current.end],
        deptTotal: current.deptTotal,
      };
    },
    [stableDepts, layoutOverride],
  );

  // Recalculate on resize or when inputs change
  useEffect(() => {
    const update = () => {
      const next = calculate(currentPageRef.current);
      currentPageRef.current = next.currentPage;
      setResult(next);
    };

    update();

    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(update, 300);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
    };
  }, [calculate]);

  // Auto-rotate pages every 10 seconds (only when there are multiple pages)
  useEffect(() => {
    if (result.totalPages <= 1) return;

    const interval = setInterval(() => {
      const nextPage = (currentPageRef.current + 1) % result.totalPages;
      currentPageRef.current = nextPage;
      setResult(calculate(nextPage));
    }, PAGE_INTERVAL);

    return () => clearInterval(interval);
  }, [result.totalPages, calculate]);

  // Reset to page 0 when department data actually changes
  useEffect(() => {
    currentPageRef.current = 0;
    setResult(calculate(0));
  }, [stableDepts, calculate]);

  return result;
}
