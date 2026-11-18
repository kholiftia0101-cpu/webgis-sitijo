<?php
session_start();
$R2_ASSET_URL = getenv('R2_ASSET_URL');
function asset_url($file)
{
  global $R2_ASSET_URL;
  if (!empty($R2_ASSET_URL)) {
    return rtrim($R2_ASSET_URL, '/') . '/assets/' . ltrim($file, '/');
  }
  return '/assets/' . ltrim($file, '/');
}
if (isset($_SESSION['user'])) {
  $redirect = isset($_GET['redirect']) ? $_GET['redirect'] : '/index.php';
  header("Location: " . htmlspecialchars($redirect));
  exit();
}
?>
<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In - SITIJO</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="../../assets/global.css">
</head>

<body class="page-signin">
    <?php include __DIR__ . "/../../partials/header.php"; ?>
    <div class="login-container">
        <div class="login-box">
            <h2>SIGN IN</h2>
            <?php if (isset($_SESSION['error'])): ?>
            <div class="error"><?= $_SESSION['error'];
                            unset($_SESSION['error']); ?></div>
            <?php endif; ?>
            <form action="../../backend/auth/cek_signin.php" method="POST">
                <input type="hidden" name="redirect"
                    value="<?= isset($_GET['redirect']) ? htmlspecialchars($_GET['redirect']) : '' ?>">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required>
                <label for="password">Password</label>
                <div class="password-wrapper">
                    <input type="password" id="password" name="password" placeholder="Masukkan password" required>
                    <i class="bi bi-eye-slash-fill" id="togglePassword"></i>
                </div>
                <div class="remember">
                    <input type="checkbox" id="remember" name="remember">
                    <label for="remember">Remember me!</label>
                </div>
                <button type="submit">SIGN IN</button>
            </form>
        </div>
    </div>
    <script>
    const togglePassword = document.querySelector('#togglePassword');
    const password = document.querySelector('#password');
    togglePassword.addEventListener('click', function() {
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        this.classList.toggle('bi-eye');
        this.classList.toggle('bi-eye-slash-fill');
    });
    </script>
</body>

</html>
