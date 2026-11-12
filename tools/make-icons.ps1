# Jana ikon PWA e-Persatuan menggunakan System.Drawing (Windows PowerShell)
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\assets\img'
$outDir = [System.IO.Path]::GetFullPath($outDir)
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function New-RoundedPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Draw-Icon([int]$size, [string]$file, [bool]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  if ($maskable) {
    $bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $bgPath.AddRectangle((New-Object System.Drawing.RectangleF 0, 0, $size, $size))
  } else {
    $bgPath = New-RoundedPath 0 0 $size $size ($size * 0.19)
  }
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point $size, $size),
    [System.Drawing.ColorTranslator]::FromHtml('#0B1437'),
    [System.Drawing.ColorTranslator]::FromHtml('#3D5AFE'))
  $g.FillPath($brush, $bgPath)

  # Grid halus
  $gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(16, 255, 255, 255)), ([float]($size / 256))
  for ($i = 1; $i -lt 8; $i++) {
    $v = [float]($size * $i / 8)
    $g.DrawLine($gridPen, $v, 0, $v, $size)
    $g.DrawLine($gridPen, 0, $v, $size, $v)
  }

  # Bulatan cahaya emas
  $glow = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glow.AddEllipse(($size * 0.52), (-$size * 0.18), ($size * 0.72), ($size * 0.72))
  $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($glow)
  $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(70, 233, 180, 76)
  $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 233, 180, 76))
  $g.FillPath($glowBrush, $glow)

  # Perisai
  $s = $size / 512.0
  $shield = New-Object System.Drawing.Drawing2D.GraphicsPath
  $pts = @(
    (New-Object System.Drawing.PointF (256 * $s), (112 * $s)),
    (New-Object System.Drawing.PointF (388 * $s), (164 * $s)),
    (New-Object System.Drawing.PointF (388 * $s), (268 * $s)),
    (New-Object System.Drawing.PointF (378 * $s), (330 * $s)),
    (New-Object System.Drawing.PointF (342 * $s), (378 * $s)),
    (New-Object System.Drawing.PointF (256 * $s), (416 * $s)),
    (New-Object System.Drawing.PointF (170 * $s), (378 * $s)),
    (New-Object System.Drawing.PointF (134 * $s), (330 * $s)),
    (New-Object System.Drawing.PointF (124 * $s), (268 * $s)),
    (New-Object System.Drawing.PointF (124 * $s), (164 * $s))
  )
  $shield.AddPolygon($pts)
  $shield.CloseFigure()
  $shieldFill = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, 255, 255, 255))
  $g.FillPath($shieldFill, $shield)
  $shieldPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), ([float](16 * $s))
  $shieldPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPath($shieldPen, $shield)

  # Tanda semak emas
  $checkPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#E9B44C')), ([float](26 * $s))
  $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $checkPts = @(
    (New-Object System.Drawing.PointF (192 * $s), (262 * $s)),
    (New-Object System.Drawing.PointF (238 * $s), (310 * $s)),
    (New-Object System.Drawing.PointF (326 * $s), (214 * $s))
  )
  $g.DrawLines($checkPen, $checkPts)

  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $brush.Dispose(); $shieldFill.Dispose(); $shieldPen.Dispose(); $checkPen.Dispose()
  Write-Output "Dijana: $file"
}

Draw-Icon 192 (Join-Path $outDir 'icon-192.png') $false
Draw-Icon 512 (Join-Path $outDir 'icon-512.png') $false
Draw-Icon 512 (Join-Path $outDir 'maskable-512.png') $true
Draw-Icon 180 (Join-Path $outDir 'apple-touch-icon.png') $false

