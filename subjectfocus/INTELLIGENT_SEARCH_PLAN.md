# Intelligent Canvas Search - Implementation Plan

## 🎯 Goal

Create an AI agent that analyzes user queries, understands course structure, and executes optimized vector searches.

---

## 📊 Example Flows

### Flow 1: Specific Item Search
```
User: "Create flashcards from Tutorial 10"
    ↓
Agent analyzes query + course structure
    ↓
Agent decides: {
  strategy: "filter_by_name",
  filters: { item_name_contains: "Tutorial 10" },
  semantic_query: "key concepts from tutorial"
}
    ↓
Vector search with filters
    ↓
Returns: Only chunks from "Tutorial 10" item
```

### Flow 2: Topic-Based Search
```
User: "Explain supply and demand from lectures"
    ↓
Agent analyzes query + course structure
    ↓
Agent decides: {
  strategy: "semantic_with_type_filter",
  filters: { item_type: "lecture_slides" },
  semantic_query: "supply and demand concepts"
}
    ↓
Vector search with filters
    ↓
Returns: Lecture chunks about supply and demand
```

### Flow 3: Broad Search
```
User: "What are the main topics in this course?"
    ↓
Agent analyzes query + course structure
    ↓
Agent decides: {
  strategy: "overview",
  filters: { item_types: ["lecture_slides", "syllabus"] },
  semantic_query: "course overview main topics"
}
    ↓
Vector search with filters
    ↓
Returns: Overview chunks from key materials
```

---

## 🏗️ Architecture

### New Endpoint: `/api/intelligent-search`

**Input:**
```json
{
  "query": "Create flashcards from Tutorial 10",
  "study_set_id": "uuid",
  "user_id": "uuid",
  "context": {
    "mode": "flashcard",  // or "study_guide", "podcast"
    "current_topic": "Supply and Demand"  // optional
  }
}
```

**Output:**
```json
{
  "results": [
    {
      "chunk_text": "...",
      "item_name": "Tutorial 10",
      "similarity": 0.89,
      "metadata": {...}
    }
  ],
  "search_strategy": {
    "strategy_used": "filter_by_name",
    "filters_applied": { "item_name_contains": "Tutorial 10" },
    "items_found": 1
  }
}
```

---

## 🔧 Implementation Steps

### Step 1: Create Course Structure Fetcher

**Function:** `getCourseStructure(studySetId, userId)`

**Returns:**
```json
{
  "course_id": "uuid",
  "course_name": "Principles of Macroeconomics",
  "modules": [
    {
      "name": "Week 1: Introduction",
      "category": "lecture_slides",
      "items": [
        { "name": "Lecture 1: Overview", "type": "File" },
        { "name": "Syllabus", "type": "Page" }
      ]
    },
    {
      "name": "Week 2: Supply and Demand",
      "category": "exercises_assignments",
      "items": [
        { "name": "Tutorial 10", "type": "Assignment" },
        { "name": "Homework 2", "type": "Assignment" }
      ]
    }
  ],
  "all_item_names": [
    "Lecture 1: Overview",
    "Syllabus",
    "Tutorial 10",
    "Homework 2"
  ]
}
```

**SQL Query:**
```sql
SELECT
  cc.id as course_id,
  cc.course_name,
  json_agg(
    json_build_object(
      'module_name', cm.module_name,
      'category', cm.category,
      'items', (
        SELECT json_agg(
          json_build_object(
            'item_name', ci.item_name,
            'item_type', ci.item_type,
            'category', ci.category,
            'canvas_item_id', ci.canvas_item_id
          )
        )
        FROM canvas_items ci
        WHERE ci.canvas_module_id = cm.id
        AND ci.vectorized = true
      )
    )
  ) as modules
FROM canvas_courses cc
JOIN canvas_modules cm ON cm.canvas_course_id = cc.id
WHERE cc.id IN (
  SELECT unnest(ss.linked_canvas_courses)
  FROM study_sets ss
  WHERE ss.id = $1 AND ss.user_id = $2
)
GROUP BY cc.id, cc.course_name;
```

---

### Step 2: Create Search Strategy Analyzer

**Function:** `analyzeSearchQuery(userQuery, courseStructure)`

**LLM Prompt:**
```
You are a search query analyzer for a student's Canvas course. Your job is to analyze
the user's query and decide the best search strategy.

Course Structure:
{courseStructure}

User Query: "{userQuery}"

Analyze this query and return a JSON object with:
{
  "strategy": "filter_by_name" | "filter_by_type" | "semantic_only" | "multi_item" | "overview",
  "reasoning": "Why you chose this strategy",
  "filters": {
    "item_names": ["Tutorial 10"],  // exact or partial matches
    "item_types": ["Assignment", "File"],  // if filtering by type
    "categories": ["exercises_assignments"],  // if filtering by category
    "exclude_items": []  // items to exclude
  },
  "semantic_query": "Optimized query for vector search",
  "search_scope": "specific" | "broad" | "all"
}

Examples:

Query: "Create flashcards from Tutorial 10"
→ {
  "strategy": "filter_by_name",
  "reasoning": "User specified a specific item name 'Tutorial 10'",
  "filters": { "item_names": ["Tutorial 10"] },
  "semantic_query": "key concepts and definitions from tutorial",
  "search_scope": "specific"
}

Query: "Explain supply and demand from lectures"
→ {
  "strategy": "filter_by_type",
  "reasoning": "User wants lecture content about a specific topic",
  "filters": { "categories": ["lecture_slides"] },
  "semantic_query": "supply and demand economic principles",
  "search_scope": "broad"
}

Query: "What's covered in all the assignments?"
→ {
  "strategy": "multi_item",
  "reasoning": "User wants overview of multiple assignments",
  "filters": { "categories": ["exercises_assignments"] },
  "semantic_query": "assignment topics and requirements",
  "search_scope": "broad"
}

Return ONLY valid JSON, no other text.
```

---

### Step 3: Update Vector Search Function

**Add metadata filtering to SQL function:**

```sql
CREATE OR REPLACE FUNCTION search_canvas_vectors_advanced(
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
    1 - (cv.embedding <=> query_embedding) AS similarity,
    cv.metadata
  FROM canvas_content_vectors cv
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
```

---

### Step 4: Build Intelligent Search Endpoint

**File:** `netlify/functions/intelligent-search.js`

```javascript
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { query, study_set_id, user_id, context = {} } = req.body

    // 1. Get course structure
    const courseStructure = await getCourseStructure(study_set_id, user_id)

    if (!courseStructure) {
      return res.json({ results: [], message: 'No linked Canvas courses' })
    }

    // 2. Analyze query with LLM
    const searchStrategy = await analyzeSearchQuery(query, courseStructure)

    // 3. Generate embedding for optimized query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: searchStrategy.semantic_query
    })

    // 4. Execute advanced vector search
    const { data: results, error } = await supabase.rpc('search_canvas_vectors_advanced', {
      query_embedding: embeddingResponse.data[0].embedding,
      course_ids: [courseStructure.course_id],
      user_id_param: user_id,
      item_names: searchStrategy.filters.item_names?.map(n => `%${n}%`),
      item_types: searchStrategy.filters.item_types,
      categories: searchStrategy.filters.categories,
      match_threshold: 0.7,
      match_count: 10
    })

    if (error) throw error

    return res.json({
      results,
      search_strategy: searchStrategy,
      course_context: {
        course_name: courseStructure.course_name,
        modules_searched: courseStructure.modules.length
      }
    })

  } catch (error) {
    console.error('Intelligent search error:', error)
    return res.status(500).json({ error: error.message })
  }
}

async function getCourseStructure(studySetId, userId) {
  // Implementation from Step 1
}

async function analyzeSearchQuery(userQuery, courseStructure) {
  // Implementation from Step 2
}
```

---

### Step 5: Update AI Chat to Use Intelligent Search

**In `server/openaiChat.js`:**

```javascript
async function getCanvasContext(query, studySetId, userId) {
  try {
    // Use intelligent search instead of basic vector search
    const response = await fetch(`${process.env.API_BASE_URL}/api/intelligent-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        study_set_id: studySetId,
        user_id: userId
      })
    })

    const { results, search_strategy } = await response.json()

    console.log('[OpenAI] Search strategy used:', search_strategy)

    return results || []
  } catch (error) {
    console.error('Failed to fetch canvas context:', error)
    return []
  }
}
```

---

## 🧪 Testing Scenarios

### Test 1: Specific Item Search
```bash
POST /api/intelligent-search
{
  "query": "Create flashcards from Tutorial 10",
  "study_set_id": "24a1a2db-...",
  "user_id": "uuid"
}

Expected Strategy:
{
  "strategy": "filter_by_name",
  "filters": { "item_names": ["Tutorial 10"] }
}
```

### Test 2: Type-Based Search
```bash
POST /api/intelligent-search
{
  "query": "Summarize all lecture content about elasticity",
  "study_set_id": "24a1a2db-...",
  "user_id": "uuid"
}

Expected Strategy:
{
  "strategy": "filter_by_type",
  "filters": { "categories": ["lecture_slides"] },
  "semantic_query": "elasticity concepts"
}
```

### Test 3: Multi-Item Search
```bash
POST /api/intelligent-search
{
  "query": "What topics are covered in tutorials 10, 11, and 12?",
  "study_set_id": "24a1a2db-...",
  "user_id": "uuid"
}

Expected Strategy:
{
  "strategy": "multi_item",
  "filters": { "item_names": ["Tutorial 10", "Tutorial 11", "Tutorial 12"] }
}
```

---

## 📊 Benefits

1. **Smarter Search** - AI understands "Tutorial 10" vs "tutorial about topic X"
2. **Context-Aware** - Knows course structure before searching
3. **Optimized Results** - Filters unnecessary content
4. **Better UX** - Users get exactly what they ask for
5. **Debuggable** - Returns search strategy used

---

## 🚀 Deployment Checklist

- [ ] Create `search_canvas_vectors_advanced` SQL function
- [ ] Build `/api/intelligent-search` endpoint
- [ ] Update `server/openaiChat.js` to use intelligent search
- [ ] Test with various query types
- [ ] Monitor LLM query analysis quality
- [ ] Add caching for course structure (expensive query)

---

**Next:** Use code-executor agent to implement this system!
