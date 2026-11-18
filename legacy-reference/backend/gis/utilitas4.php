<?php
/**
 * Endpoint Bangunan - BBOX GeoJSON
 *
 * Request:
 *   GET ?bbox=minLng,minLat,maxLng,maxLat&zoom=15
 *
 * Geometry bangunan:
 *   SRID = 0
 *   Koordinat sebenarnya = longitude / latitude WGS84
 *
 * Response normal:
 *   {
 *     "bangunan": {
 *       "type": "FeatureCollection",
 *       "features": [...]
 *     }
 *   }
 *
 * Jika isi BBOX terlalu banyak:
 *   {
 *     "status": "too_many",
 *     "count": 2001,
 *     "max": 2000
 *   }
 */

ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('memory_limit', '512M');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=30, stale-while-revalidate=60');
header('X-Content-Type-Options: nosniff');

require_once $_SERVER['DOCUMENT_ROOT'] . '/backend/db/koneksi.php';


/* =========================================================
 * CONFIG
 * ========================================================= */

const MAX_FEATURES = 2000;


/* =========================================================
 * RESPONSE HELPERS
 * ========================================================= */

function fail_json(string $message, int $status = 400): never
{
    http_response_code($status);

    echo json_encode(
        [
            'status' => 'error',
            'message' => $message,
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}


function too_many_json(int $count): never
{
    echo json_encode(
        [
            'status' => 'too_many',
            'count'  => $count,
            'max'    => MAX_FEATURES,
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}


/* =========================================================
 * INPUT PARSER
 * ========================================================= */

function parse_bbox(?string $raw): array
{
    if ($raw === null || trim($raw) === '') {
        fail_json(
            'Parameter bbox wajib diisi. Format: minLng,minLat,maxLng,maxLat'
        );
    }

    $parts = array_map('trim', explode(',', $raw));

    if (count($parts) !== 4) {
        fail_json('Format bbox tidak valid.');
    }

    foreach ($parts as $part) {
        if ($part === '' || !is_numeric($part)) {
            fail_json('Nilai bbox harus numerik.');
        }
    }

    [$minLng, $minLat, $maxLng, $maxLat] = array_map(
        'floatval',
        $parts
    );

    if (
        $minLng < -180 ||
        $maxLng > 180 ||
        $minLat < -90 ||
        $maxLat > 90 ||
        $minLng >= $maxLng ||
        $minLat >= $maxLat
    ) {
        fail_json('Rentang bbox tidak valid.');
    }

    return [
        $minLng,
        $minLat,
        $maxLng,
        $maxLat
    ];
}


function parse_zoom(?string $raw): int
{
    $zoom = is_numeric($raw)
        ? (int) $raw
        : 15;

    return max(10, min(21, $zoom));
}


/* =========================================================
 * SIMPLIFY
 * ========================================================= */

function get_simplify_tolerance(int $zoom): float
{
    if ($zoom <= 12) {
        return 0.00010;
    }

    if ($zoom <= 13) {
        return 0.00005;
    }

    if ($zoom <= 14) {
        return 0.00002;
    }

    return 0.0;
}


/* =========================================================
 * MAIN
 * ========================================================= */

try {

    if (!isset($conn) || !($conn instanceof PDO)) {
        throw new RuntimeException(
            'Koneksi database tidak tersedia.'
        );
    }

    $bbox = parse_bbox($_GET['bbox'] ?? null);
    $zoom = parse_zoom($_GET['zoom'] ?? null);

    [$minLng, $minLat, $maxLng, $maxLat] = $bbox;

    $simplifyTolerance = get_simplify_tolerance($zoom);


    /* =====================================================
     * BBOX
     *
     * Data bangunan mempunyai SRID 0.
     *
     * Koordinatnya sudah berupa lon/lat WGS84, sehingga kita
     * TIDAK melakukan ST_Transform().
     *
     * BBOX juga dibuat SRID 0 agar:
     *
     *   bangunan.geometri SRID 0
     *             +
     *   bbox         SRID 0
     *
     * cocok untuk && dan ST_Intersects().
     *
     * Ini juga lebih baik daripada:
     *
     *   ST_SetSRID(b.geometri, 4326)
     *
     * karena fungsi tidak ditempelkan ke kolom geometry,
     * sehingga spatial index tetap lebih mudah digunakan.
     * ===================================================== */

    $bboxSql = '
        ST_SetSRID(
            ST_MakeEnvelope(
                ?, ?, ?, ?
            ),
            0
        )
    ';


    /* =====================================================
     * STEP 1
     *
     * Probe maksimal 2001 ID.
     *
     * Kita tidak menghitung seluruh 31 ribu bangunan.
     * Begitu ditemukan 2001, langsung berhenti.
     * ===================================================== */

    $probeSql = "
        SELECT b.id
        FROM public.bangunan AS b
        CROSS JOIN LATERAL (
            SELECT {$bboxSql} AS bbox
        ) AS v
        WHERE b.geometri IS NOT NULL
          AND b.geometri && v.bbox
          AND ST_Intersects(b.geometri, v.bbox)
        ORDER BY b.id
        LIMIT " . (MAX_FEATURES + 1);

    $probeStmt = $conn->prepare($probeSql);

    $probeStmt->execute([
        $minLng,
        $minLat,
        $maxLng,
        $maxLat
    ]);

    $ids = $probeStmt->fetchAll(PDO::FETCH_COLUMN);


    /* =====================================================
     * STEP 2
     *
     * Jika > 2000:
     * jangan kirim GeoJSON besar.
     *
     * Frontend akan split BBOX secara recursive.
     * ===================================================== */

    if (count($ids) > MAX_FEATURES) {
        too_many_json(count($ids));
    }


    /* =====================================================
     * STEP 3
     *
     * Tidak ada bangunan.
     * ===================================================== */

    if (count($ids) === 0) {

        echo json_encode(
            [
                'bangunan' => [
                    'type' => 'FeatureCollection',
                    'features' => []
                ]
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES
        );

        exit;
    }


    /* =====================================================
     * STEP 4
     *
     * Ambil data hanya berdasarkan ID yang sudah lolos BBOX.
     *
     * Ini jauh lebih ringan daripada jsonb_agg seluruh hasil.
     * ===================================================== */

    $placeholders = implode(
        ',',
        array_fill(0, count($ids), '?')
    );


    /*
     * Pada zoom rendah, geometry disederhanakan.
     * Pada zoom >= 15, geometry asli dipakai.
     */

    if ($simplifyTolerance > 0) {

        $geometrySql = "
            ST_SimplifyPreserveTopology(
                b.geometri,
                ?
            )
        ";

        $geometryParams = [
            $simplifyTolerance
        ];

    } else {

        $geometrySql = 'b.geometri';

        $geometryParams = [];
    }


    $sql = "
        SELECT
            b.id,
            b.kelas,
            b.subkelas,
            b.kelurahan,
            b.kemantren,
            ST_AsGeoJSON(
                {$geometrySql},
                6
            ) AS geojson
        FROM public.bangunan AS b
        WHERE b.id IN ({$placeholders})
        ORDER BY b.id
    ";


    $stmt = $conn->prepare($sql);

    /*
     * Urutan parameter:
     *
     * simplify parameter (jika ada)
     * kemudian seluruh ID.
     */

    $params = array_merge(
        $geometryParams,
        array_values($ids)
    );

    $stmt->execute($params);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);


    /* =====================================================
     * STEP 5
     *
     * Bangun FeatureCollection.
     * ===================================================== */

    $features = [];

    foreach ($rows as $row) {

        if (
            !isset($row['geojson']) ||
            $row['geojson'] === ''
        ) {
            continue;
        }

        $geometry = json_decode(
            $row['geojson'],
            true
        );

        if ($geometry === null) {
            continue;
        }

        $features[] = [
            'type' => 'Feature',

            'geometry' => $geometry,

            'properties' => [
                'id' => is_numeric($row['id'])
                    ? (int) $row['id']
                    : $row['id'],

                'kelas' => $row['kelas'],
                'subkelas' => $row['subkelas'],
                'kelurahan' => $row['kelurahan'],
                'kemantren' => $row['kemantren'],
            ]
        ];
    }


    /* =====================================================
     * STEP 6
     *
     * Response final.
     * ===================================================== */

    echo json_encode(
        [
            'bangunan' => [
                'type' => 'FeatureCollection',
                'features' => $features
            ]
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );


} catch (Throwable $e) {

    /*
     * Simpan error asli di server log.
     */

    error_log(
        'utilitas4.php ERROR: ' .
        $e->getMessage() .
        ' | file=' .
        $e->getFile() .
        ' | line=' .
        $e->getLine()
    );


    /*
     * Saat debug=1, tampilkan error asli.
     * Jangan digunakan terus-menerus di production.
     */

    if (
        isset($_GET['debug']) &&
        $_GET['debug'] === '1'
    ) {

        http_response_code(500);

        echo json_encode(
            [
                'status' => 'error',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_UNESCAPED_SLASHES
        );

        exit;
    }


    fail_json(
        'Gagal mengambil data bangunan.',
        500
    );
}
