<?php

require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

try {
    $mysqli = db();
    $res = $mysqli->query('SELECT category_id, name, description FROM categories ORDER BY category_id ASC');
    if (!$res) {
        throw new RuntimeException('Query failed: ' . $mysqli->error);
    }
    $rows = [];
    while ($row = $res->fetch_assoc()) {
        $rows[] = $row;
    }

    $categories = array_map(function ($row) {
        return [
            'category_id' => (int)$row['category_id'],
            'name'        => $row['name'],
            'description' => $row['description'],
        ];
    }, $rows);

    jsonResponse($categories);
} catch (Throwable $e) {
    $payload = ['error' => 'Failed to load categories'];
    if (isDebug()) {
        $payload['detail'] = $e->getMessage();
    }
    jsonResponse($payload, 500);
}

