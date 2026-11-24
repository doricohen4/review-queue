<?php

namespace App\Http\Controllers;

use App\Http\Queries\ItemQuery;
use App\Http\Requests\ReviewItemsRequest;
use App\Http\Requests\StoreItemRequest;
use App\Http\Resources\ItemResource;
use App\Http\Resources\ReviewResource;
use App\Models\Item;
use App\Services\ItemService;
use App\Services\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class ItemController extends Controller
{
    /** GET /api/items/{item} — one queue row for the open panel. */
    public function show(Item $item): ItemResource
    {
        $item->load('submitter');

        return new ItemResource($item);
    }

    /** GET /api/items — paginated queue (filters live in ItemQuery). */
    public function index(Request $request, ItemQuery $query): AnonymousResourceCollection
    {
        return ItemResource::collection($query->paginate($request));
    }

    /** GET /api/items/filters — toolbar options from the same registry. */
    public function filters(ItemQuery $query): JsonResponse
    {
        return response()->json([
            'data' => $query->catalog(),
        ]);
    }

    /** POST /api/items — HTTP wrapper around ItemService::submit (201). */
    public function store(StoreItemRequest $request, ItemService $service): JsonResponse
    {
        $item = $service->submit(
            $request->validated('title'),
            $request->validated('description'),
            $request->validated('submitter_name'),
        );

        $item->load('submitter');

        return (new ItemResource($item))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /** POST /api/items/review — 200 if all ids succeed, 207 if any failed[]. */
    public function review(ReviewItemsRequest $request, ReviewService $service): JsonResponse
    {
        $result = $service->review(
            $request->validated('ids'),
            $request->validated('decision'),
            $request->validated('risk'),
            $request->validated('note'),
            $request->validated('reviewer_name'),
        );

        $failedCount = count($result['failed']);

        return response()->json([
            'data' => [
                'updated' => $result['updated'],
                'failed' => $result['failed'],
            ],
            'meta' => [
                'updated_count' => count($result['updated']),
                'failed_count' => $failedCount,
            ],
        ], $failedCount > 0 ? 207 : Response::HTTP_OK);
    }

    /** POST /api/items/{item}/resubmit — needs_work → pending, new heuristic snapshot. */
    public function resubmit(Item $item, StoreItemRequest $request, ItemService $service): ItemResource
    {
        $item = $service->resubmit(
            $item,
            $request->validated('title'),
            $request->validated('description'),
            $request->validated('submitter_name'),
        );

        return new ItemResource($item);
    }

    /** GET /api/items/{item}/audit — append-only review notes, oldest first. */
    public function audit(Item $item): AnonymousResourceCollection
    {
        return ReviewResource::collection(
            $item->reviews()->with('reviewer')->orderBy('id')->paginate(),
        );
    }
}
