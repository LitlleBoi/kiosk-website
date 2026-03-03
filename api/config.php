<?php

// Simple mysqli configuration for XAMPP / MariaDB.
// Adjust these values if your database credentials are different.

const DB_HOST = '127.0.0.1';
const DB_PORT = 3306;
const DB_NAME = 'happy_herbivore';
const DB_USER = 'root';
const DB_PASS = ''; // XAMPP default is empty password

function isDebug(): bool
{
    return isset($_GET['debug']) && $_GET['debug'] === '1';
}

function db()
{
    static $mysqli = null;
    if (is_object($mysqli)) {
        return $mysqli;
    }

    $mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
    if ($mysqli->connect_errno) {
        throw new RuntimeException('DB connect failed: ' . $mysqli->connect_error);
    }

    if (!$mysqli->set_charset('utf8mb4')) {
        throw new RuntimeException('Failed to set charset: ' . $mysqli->error);
    }

    return $mysqli;
}

function jsonResponse($data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

