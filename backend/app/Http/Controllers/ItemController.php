<?php

namespace App\Http\Controllers;

use App\Http\Queries\ItemQuery;
use App\Http\Requests\StoreItemRequest;
use App\Http\Resources\ItemResource;
use App\Services\ItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class ItemController extends Controller
{
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
}
