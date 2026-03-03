<?php

require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
    jsonResponse(['error' => 'Invalid payload'], 400);
}

try {
    $mysqli = db();
    $mysqli->begin_transaction();

    // Normalize items
    $items = [];
    foreach ($data['items'] as $item) {
        if (!isset($item['productId'], $item['qty'])) {
            continue;
        }
        $productId = (int)$item['productId'];
        $qty = max(1, (int)$item['qty']);
        if ($productId <= 0 || $qty <= 0) {
            continue;
        }
        $items[] = ['product_id' => $productId, 'qty' => $qty];
    }

    if (empty($items)) {
        jsonResponse(['error' => 'No valid items'], 400);
    }

    // Load product prices from DB
    $ids = array_column($items, 'product_id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    $stmt = $mysqli->prepare("SELECT product_id, price FROM products WHERE product_id IN ($placeholders)");
    if (!$stmt) {
        throw new RuntimeException('Prepare failed: ' . $mysqli->error);
    }
    $types = str_repeat('i', count($ids));
    $stmt->bind_param($types, ...$ids);
    $stmt->execute();
    $res = $stmt->get_result();
    $prices = [];
    while ($row = $res->fetch_assoc()) {
        $prices[(int)$row['product_id']] = (float)$row['price'];
    }
    $stmt->close();

    $total = 0.0;
    foreach ($items as &$item) {
        $pid = $item['product_id'];
        if (!isset($prices[$pid])) {
            continue;
        }
        $item['unit_price'] = $prices[$pid];
        $total += $prices[$pid] * $item['qty'];
    }
    unset($item);

    if ($total <= 0) {
        jsonResponse(['error' => 'Products not found'], 400);
    }

    // Determine next pickup number
    $pickupRes = $mysqli->query('SELECT IFNULL(MAX(pickup_number), 0) AS max_no FROM orders');
    if (!$pickupRes) {
        throw new RuntimeException('Query failed: ' . $mysqli->error);
    }
    $pickupRow = $pickupRes->fetch_assoc();
    $nextPickup = (int)($pickupRow['max_no'] ?? 0) + 1;

    // Insert order (order_status_id 1 = e.g. "new")
    $orderStmt = $mysqli->prepare(
        'INSERT INTO orders (order_status_id, pickup_number, price_total) VALUES (?, ?, ?)'
    );
    if (!$orderStmt) {
        throw new RuntimeException('Prepare failed: ' . $mysqli->error);
    }
    $statusId = 1;
    $orderStmt->bind_param('iid', $statusId, $nextPickup, $total);
    $orderStmt->execute();
    $orderId = (int)$mysqli->insert_id;
    $orderStmt->close();

    // Insert order_product rows
    $opStmt = $mysqli->prepare(
        'INSERT INTO order_product (order_id, product_id, price) VALUES (?, ?, ?)'
    );
    if (!$opStmt) {
        throw new RuntimeException('Prepare failed: ' . $mysqli->error);
    }

    foreach ($items as $item) {
        $pid = (int)$item['product_id'];
        $unitPrice = (float)$item['unit_price'];
        $opStmt->bind_param('iid', $orderId, $pid, $unitPrice);
        $opStmt->execute();
    }
    $opStmt->close();

    $mysqli->commit();

    jsonResponse([
        'order_id'      => $orderId,
        'pickup_number' => $nextPickup,
        'price_total'   => $total,
    ], 201);
} catch (Throwable $e) {
    try {
        if (isset($mysqli) && is_object($mysqli)) {
            $mysqli->rollback();
        }
    } catch (Throwable $ignored) {
    }
    jsonResponse(['error' => 'Failed to create order'], 500);
}

