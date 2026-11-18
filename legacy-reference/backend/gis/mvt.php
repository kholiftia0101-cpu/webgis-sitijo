<?php

declare(strict_types=1);

header('Content-Type: application/vnd.mapbox-vector-tile');
header('Cache-Control: public, max-age=300');

include $_SERVER['DOCUMENT_ROOT'] . "/backend/db/koneksi.php";

try {

    $layer = $_GET['layer'] ?? '';
    $z = isset($_GET['z']) ? (int) $_GET['z'] : -1;
    $x = isset($_GET['x']) ? (int) $_GET['x'] : -1;
    $y = isset($_GET['y']) ? (int) $_GET['y'] : -1;

    /*
     * Layer yang boleh diakses melalui endpoint MVT.
     *
     * Jangan pernah menerima nama tabel langsung dari URL.
     */
    $allowedLayers = [
        'bangunan' => [
            'table' => 'public.bangunan',
            'id'    => 'id'
        ],
    ];

    if (!isset($allowedLayers[$layer])) {
        http_response_code(404);
        exit;
    }

    /*
     * Validasi tile coordinate.
     */
    if (
        $z < 0 ||
        $z > 22 ||
        $x < 0 ||
        $y < 0
    ) {
        http_response_code(400);
        exit;
    }

    $maxTile = (2 ** $z) - 1;

    if ($x > $maxTile || $y > $maxTile) {
        http_response_code(400);
        exit;
    }

    $table = $allowedLayers[$layer]['table'];
    $idCol = $allowedLayers[$layer]['id'];

    /*
     * Generate MVT langsung dari master PostGIS.
     *
     * Master geometry TIDAK diubah.
     * ST_Transform hanya dilakukan saat membuat tile display.
     */
    $sql = "
        WITH tile AS (
            SELECT ST_TileEnvelope(:z, :x, :y) AS bounds
        ),
        mvtgeom AS (
            SELECT
                b.{$idCol} AS id,
                b.kelas,
                b.subkelas,
                b.kelurahan,
                b.kemantren,

                ST_AsMVTGeom(
                    ST_Transform(b.geometri, 3857),
                    tile.bounds,
                    4096,
                    64,
                    true
                ) AS geom

            FROM {$table} b
            CROSS JOIN tile

            WHERE
                b.geometri &&
                ST_Transform(tile.bounds, 4326)
        ),
        tile_data AS (
            SELECT
                ST_AsMVT(
                    mvtgeom,
                    :layer,
                    4096,
                    'geom'
                ) AS tile

            FROM mvtgeom

            WHERE geom IS NOT NULL
        )
        SELECT
            encode(tile, 'hex') AS tile_hex
        FROM tile_data
    ";

    $stmt = $conn->prepare($sql);

    $stmt->bindValue(':z', $z, PDO::PARAM_INT);
    $stmt->bindValue(':x', $x, PDO::PARAM_INT);
    $stmt->bindValue(':y', $y, PDO::PARAM_INT);
    $stmt->bindValue(':layer', $layer, PDO::PARAM_STR);

    $stmt->execute();

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (
        !$row ||
        !isset($row['tile_hex']) ||
        $row['tile_hex'] === null ||
        $row['tile_hex'] === ''
    ) {
        http_response_code(204);
        exit;
    }

    $tile = hex2bin($row['tile_hex']);

    if ($tile === false || $tile === '') {
        http_response_code(500);
        exit;
    }

    header('Content-Length: ' . strlen($tile));

    echo $tile;
    exit;

} catch (Throwable $e) {

    error_log(
        'MVT ERROR: ' .
        get_class($e) .
        ' - ' .
        $e->getMessage()
    );

    http_response_code(500);
    exit;
}