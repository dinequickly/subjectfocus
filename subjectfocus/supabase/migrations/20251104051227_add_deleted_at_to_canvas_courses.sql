-- Add deleted_at column for soft delete functionality
ALTER TABLE public.canvas_courses
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add index for filtering non-deleted courses
CREATE INDEX IF NOT EXISTS idx_canvas_courses_deleted_at
    ON public.canvas_courses(deleted_at);

-- Add comment for documentation
COMMENT ON COLUMN public.canvas_courses.deleted_at IS 'Soft delete timestamp. When set, course is ignored during sync.';
