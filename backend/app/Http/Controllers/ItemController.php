<?php

namespace App\Http\Controllers;

use App\Http\Queries\ItemQuery;
use App\Http\Resources\ItemResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ItemController extends Controller
{
    public function index(Request $request, ItemQuery $query): AnonymousResourceCollection
    {
        return ItemResource::collection($query->paginate($request));
    }

    public function filters(ItemQuery $query): JsonResponse
    {
        return response()->json([
            'data' => $query->catalog(),
        ]);
    }
}
