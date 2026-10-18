Add-Type -AssemblyName System.Drawing
foreach ($size in @(192, 512)) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#314d40'))
    $cream = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f2f4dc'))
    $sage = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#c4d787'))
    $graphics.FillRectangle($cream, [single]($size * 0.3), [single]($size * 0.25), [single]($size * 0.12), [single]($size * 0.5))
    $graphics.FillRectangle($cream, [single]($size * 0.3), [single]($size * 0.65), [single]($size * 0.4), [single]($size * 0.1))
    $graphics.FillEllipse($sage, [single]($size * 0.58), [single]($size * 0.21), [single]($size * 0.2), [single]($size * 0.2))
    $bitmap.Save((Join-Path $PSScriptRoot "../public/icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    $cream.Dispose()
    $sage.Dispose()
}
