<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
ini_set('memory_limit','1024M');
error_reporting(E_ALL);

include $_SERVER['DOCUMENT_ROOT'] . "/backend/db/koneksi.php";

if (!function_exists('json_response')) {
    function json_response($data, $status = 200)
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function normalizeKey($str)
{
    return strtolower(str_replace(" ", "_", trim($str)));
}

function getStyles()
{
    $R2_ASSET_URL = getenv('R2_ASSET_URL');

    if (!empty($R2_ASSET_URL)) {
        $basePath = rtrim($R2_ASSET_URL, '/') . '/assets';
    } else {
        $basePath = '/assets';
    }

    return [
        "bangunan" => [
            "bangunan" => [
                "type"      => "polygon",
                "color"     => "rgba(255, 116, 92, 0.8)",
                "fillColor" => "rgba(255,140,66,0.35)",
                "fillOpacity" => 0.35,
                "weight"    => 1.5
            ]
        ],
    ];
}

function getStyle($kelas, $subkelas)
{
    $styles = getStyles();
    $kelas = normalizeKey($kelas);
    $subkelas = normalizeKey($subkelas);
    return $styles[$kelas][$subkelas] ?? ["color" => "#666", "weight" => 1];
}

function getUtilitas($conn, $table, $fields, $kelas, $minId, $maxId)
{
    $cols = implode(", ", $fields);
    // BBOX opsional: tetap kompatibel dengan request lama tanpa parameter bbox.
    // Format: minLng,minLat,maxLng,maxLat (EPSG:4326).
    $bbox = null;
    if (isset($_GET['bbox'])) {
        $parts = array_map('trim', explode(',', $_GET['bbox']));
        if (count($parts) === 4) {
            $values = array_map('floatval', $parts);
            $allNumeric = true;
            foreach ($parts as $part) {
                if ($part === '' || !is_numeric($part)) {
                    $allNumeric = false;
                    break;
                }
            }

            [$minLng, $minLat, $maxLng, $maxLat] = $values;
            if (
                $allNumeric &&
                $minLng >= -180 && $maxLng <= 180 &&
                $minLat >= -90 && $maxLat <= 90 &&
                $minLng < $maxLng && $minLat < $maxLat
            ) {
                $bbox = [$minLng, $minLat, $maxLng, $maxLat];
            }
        }
    }

    $sql = "SELECT $cols, ST_AsGeoJSON(geometri) AS geojson
            FROM $table
            WHERE id BETWEEN :min_id AND :max_id";

    $params = [
        ':min_id' => $minId,
        ':max_id' => $maxId
    ];

    if ($bbox !== null) {
        $sql = "SELECT $cols, ST_AsGeoJSON(geometri) AS geojson
                FROM $table
                CROSS JOIN (
                    SELECT ST_SetSRID(
  ST_MakeEnvelope(
    :min_lng, :min_lat,
    :max_lng, :max_lat
  ),
  0
) AS bbox
                ) AS view_bbox
                WHERE id BETWEEN :min_id AND :max_id
                  AND geometri && view_bbox.bbox
                  AND ST_Intersects(geometri, view_bbox.bbox)";
        $params[':min_lng'] = $bbox[0];
        $params[':min_lat'] = $bbox[1];
        $params[':max_lng'] = $bbox[2];
        $params[':max_lat'] = $bbox[3];
    }

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $result = $stmt;
    $features = [];
    if ($result) {
        while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
            $subkelas = strtolower(trim($row['subkelas'] ?? 'lainnya'));
            $style = getStyle($kelas, $subkelas);

            $geometry = null;
            if (!empty($row['geojson']) && is_string($row['geojson'])) {
                $geometry = json_decode($row['geojson']);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    error_log("⚠️ Gagal decode GeoJSON ($table): " . json_last_error_msg());
                    $geometry = null;
                }
            }
            unset($row['geojson']);
            if ($geometry && isset($geometry->type)) {
                if ($geometry->type === "GeometryCollection") {
                    if (
                        !isset($geometry->geometries) ||
                        !is_array($geometry->geometries) ||
                        count($geometry->geometries) === 0
                    ) {
                        continue;
                    }
                }
                $allowedTypes = ["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"];
                if (!in_array($geometry->type, $allowedTypes)) {
                    error_log("⚠️ Geometry type tidak dikenal ($table): " . $geometry->type);
                    continue;
                }
                $features[] = [
                    "type" => "Feature",
                    "geometry" => $geometry,
                    "properties" => $row,
                    "style" => $style
                ];
            }
        }
    }
    return [
        "type" => "FeatureCollection",
        "features" => $features
    ];
}

function gabungPerKelas($subcollections)
{
    $all = [];
    foreach ($subcollections as $fc) {
        if (!empty($fc['features'])) {
            $all = array_merge($all, $fc['features']);
        }
    }
    return ["type" => "FeatureCollection", "features" => $all];
}

$response = [
    //bangunan
    "bangunan" => getUtilitas($conn, "bangunan", ["id", "kelas", "subkelas", "kelurahan", "kemantren"], "bangunan", 13901, 16550),
];

echo json_encode($response, JSON_UNESCAPED_UNICODE);
