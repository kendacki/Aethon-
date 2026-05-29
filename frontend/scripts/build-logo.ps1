# Builds logo-white.png (white monogram, transparent background) from logo-an-source.png.
param(
  [string]$Source = "$PSScriptRoot/../public/logo-an-source.png",
  [string]$Dest = "$PSScriptRoot/../public/logo-white.png"
)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Source))
$w = $img.Width
$h = $img.Height
$bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $c = $img.GetPixel($x, $y)
    $lum = ($c.R + $c.G + $c.B) / 3.0
    if ($lum -gt 235) {
      $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
    } else {
      $alpha = [Math]::Min(255, [int]((255 - $lum) * 1.35))
      $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, 255, 255, 255))
    }
  }
}

$destPath = (Join-Path (Split-Path $Source -Parent) "logo-white.png")
if ($Dest -ne "$PSScriptRoot/../public/logo-white.png") { $destPath = $Dest }

$bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
$bmp.Dispose()
Write-Output "Wrote $destPath"
