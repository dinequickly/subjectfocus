-- Intelligent Canvas Search - Advanced Search Function with Filtering
-- Extends search_canvas_vectors with metadata and name-based filtering

-- =============================================
-- 1. Create search_canvas_vectors_advanced function
-- =============================================
-- This function enables intelligent search with flexible filtering:
-- - Filter by item names using ILIKE pattern matching
-- - Filter by item types (exact match)
-- - Filter by metadata category (exact match)
--
-- Example usage:
-- SELECT * FROM search_canvas_vectors_advanced(
--   embedding, ARRAY[course_id], user_id,
--   item_names := ARRAY['%Tutorial 10%', '%tutorial 10%'],
--   categories := ARRAY['exercises_assignments'],
--   match_threshold := 0.7,
--   match_count := 10
-- );

CREATE OR REPLACE FUNCTION public.search_canvas_vectors_advanced(
  query_embedding vector(1536),
  course_ids uuid[],
  user_id_param uuid,
  item_names text[] DEFAULT NULL,
  item_types text[] DEFAULT NULL,
  categories text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  canvas_item_id text,
  item_name text,
  item_type text,
  chunk_text text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cv.id,
    cv.canvas_item_id,
    cv.item_name,
    cv.item_type,
    cv.chunk_text,
    ROUND((1 - (cv.embedding <=> query_embedding))::numeric, 4)::float AS similarity,
    cv.metadata
  FROM public.canvas_content_vectors cv
  WHERE
    cv.user_id = user_id_param
    AND cv.canvas_course_id = ANY(course_ids)
    AND 1 - (cv.embedding <=> query_embedding) > match_threshold
    -- Apply filters if provided
    AND (item_names IS NULL OR cv.item_name ILIKE ANY(item_names))
    AND (item_types IS NULL OR cv.item_type = ANY(item_types))
    AND (categories IS NULL OR cv.metadata->>'category' = ANY(categories))
  ORDER BY cv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.search_canvas_vectors_advanced(
  vector, uuid[], uuid, text[], text[], text[], float, int
) IS 'Advanced search for semantically similar canvas content with flexible filtering by item names, types, and categories. Uses ILIKE for name matching to support partial queries like "Tutorial 10".';
