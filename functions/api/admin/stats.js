import { json } from '../../../lib/util.js';

export const onRequestGet = async ({ env }) => {
  const year = String(new Date().getUTCFullYear());
  const s = await env.DB.prepare(`
    SELECT
      SUM(status = 'available') AS on_site,
      SUM(status = 'draft') AS drafts,
      SUM(status = 'sold') AS sold_total,
      SUM(status = 'sold' AND substr(sold_at, 1, 4) = ?1) AS sold_year,
      SUM(CASE WHEN status = 'sold' AND substr(sold_at, 1, 4) = ?1 THEN COALESCE(sold_price, price, 0) ELSE 0 END) AS revenue_year,
      SUM(CASE WHEN print_paper_price IS NOT NULL THEN prints_edition ELSE 0 END
        + CASE WHEN print_canvas_price IS NOT NULL THEN prints_edition ELSE 0 END) AS prints_total,
      SUM(CASE WHEN print_paper_price IS NOT NULL THEN print_paper_sold ELSE 0 END
        + CASE WHEN print_canvas_price IS NOT NULL THEN print_canvas_sold ELSE 0 END) AS prints_sold,
      SUM(CASE WHEN print_paper_price IS NOT NULL THEN print_paper_sold * print_paper_price ELSE 0 END
        + CASE WHEN print_canvas_price IS NOT NULL THEN print_canvas_sold * print_canvas_price ELSE 0 END) AS prints_revenue
    FROM paintings`).bind(year).first();
  const n = (v) => Number(v || 0);
  return json({
    year: Number(year),
    onSite: n(s.on_site),
    drafts: n(s.drafts),
    soldTotal: n(s.sold_total),
    soldYear: n(s.sold_year),
    revenueYear: n(s.revenue_year),
    printsTotal: n(s.prints_total),
    printsLeft: n(s.prints_total) - n(s.prints_sold),
    printsRevenue: n(s.prints_revenue),
  });
};
