<?php

require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    $mysqli = db();

    $sql = 'SELECT 
                p.product_id,
                p.category_id,
                p.image_id,
                p.name,
                p.description,
                p.price,
                p.kcal,
                p.available
            FROM products p
            WHERE p.available = 1
            ORDER BY p.category_id, p.product_id';

    $res = $mysqli->query($sql);
    if (!$res) {
        throw new RuntimeException('Query failed: ' . $mysqli->error);
    }
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }

    $products = array_map(function ($row) {
        return [
            'product_id'  => (int)$row['product_id'],
            'category_id' => (int)$row['category_id'],
            'image_id'    => $row['image_id'] !== null ? (int)$row['image_id'] : null,
            'name'        => $row['name'],
            'description' => $row['description'],
            'price'       => (float)$row['price'],
            'kcal'        => $row['kcal'] !== null ? (int)$row['kcal'] : null,
            'available'   => (int)$row['available'] === 1,
        ];
    }, $rows);

    jsonResponse($products);
} catch (Throwable $e) {
    $payload = ['error' => 'Failed to load products'];
    if (isDebug()) {
        $payload['detail'] = $e->getMessage();
    }
    jsonResponse($payload, 500);
}

