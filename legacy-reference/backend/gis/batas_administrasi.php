<?php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

include $_SERVER['DOCUMENT_ROOT'] . "/backend/db/koneksi.php";

try {
    $sql = "SELECT id_kel, luas_kel, kelurahan, kemantren, kota, provinsi, negara, ST_AsGeoJSON(geometri) AS geojson 
            FROM batas_administrasi";

    $result = $conn->query($sql);

    $features = [];

    while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
        $geometry = json_decode($row['geojson']);
        unset($row['geojson']);

        $features[] = [
            "type" => "Feature",
            "geometry" => $geometry,
            "properties" => $row
        ];
    }

    echo json_encode([
        "type" => "FeatureCollection",
        "features" => $features
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode([
        "error" => "Query gagal: " . $e->getMessage()
    ]);
    exit;
}
?>
