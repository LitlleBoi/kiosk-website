<?php

require __DIR__ . '/config.php';

// Debug-friendly health endpoint
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

@file_put_contents(__DIR__ . '/_debug.txt', "health start\n", FILE_APPEND);

try {
    $mysqli = db();
    @file_put_contents(__DIR__ . '/_debug.txt', "db ok\n", FILE_APPEND);
    $dbRes = $mysqli->query('SELECT DATABASE() AS db');
    if (!$dbRes) {
        throw new RuntimeException('Query failed: ' . $mysqli->error);
    }
    $dbName = $dbRes->fetch_assoc();
    @file_put_contents(__DIR__ . '/_debug.txt', "db name ok\n", FILE_APPEND);

    $catsRes = $mysqli->query('SELECT COUNT(*) AS c FROM categories');
    $prodsRes = $mysqli->query('SELECT COUNT(*) AS c FROM products');
    if (!$catsRes || !$prodsRes) {
        throw new RuntimeException('Query failed: ' . $mysqli->error);
    }
    $cats = $catsRes->fetch_assoc();
    $prods = $prodsRes->fetch_assoc();
    @file_put_contents(__DIR__ . '/_debug.txt', "counts ok\n", FILE_APPEND);

    jsonResponse([
        'ok' => true,
        'db' => $dbName['db'] ?? null,
        'counts' => [
            'categories' => (int)($cats['c'] ?? 0),
            'products' => (int)($prods['c'] ?? 0),
        ],
    ]);
} catch (Throwable $e) {
    @file_put_contents(__DIR__ . '/_debug.txt', "error: " . $e->getMessage() . "\n", FILE_APPEND);
    jsonResponse([
        'ok' => false,
        'error' => $e->getMessage(),
    ], 500);
}

