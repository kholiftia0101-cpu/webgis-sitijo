<?php
session_start();
require_once dirname(__DIR__) . '/partials/helpers.php';
$pdfPanduan = asset_url('panduan-webgis-sitijo.pdf');
?>

<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panduan Upload Data</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../assets/global.css">
</head>

<body class="page-panduan">
    <?php include dirname(__DIR__) . "/partials/header.php"; ?>
    <?php include dirname(__DIR__) . "/partials/sidebar.php"; ?>
    <div class="main-container">
        <div class="card">
            <h4>🎬 Panduan Penggunaan WEBGIS</h4>
            <iframe class="video-box" src="https://drive.google.com/file/d/13STCML0QjTnBF-4mq1PibAbgCy0wLoYz/preview"
                title="Video Panduan Penggunaan WEBGIS" allow="autoplay" allowfullscreen>
            </iframe>
        </div>
        <div class="card">
            <h4>📄 Panduan Penggunaan WEBGIS</h4>
            <iframe class="pdf-box" src="<?= htmlspecialchars($pdfPanduan, ENT_QUOTES, 'UTF-8') ?>"
                title="Panduan Penggunaan WEBGIS PDF">
            </iframe>
            <a href="<?= htmlspecialchars($pdfPanduan, ENT_QUOTES, 'UTF-8') ?>" target="_blank"
                rel="noopener noreferrer" class="download-btn">
                <i class="bi bi-download"></i>
                Download Panduan PDF
            </a>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>
