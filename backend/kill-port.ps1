# Kill processes using port 5000
$port = 5000
Write-Host "🔍 Checking for processes using port $port..."

$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    Write-Host "Found processes: $($processes -join ', ')"
    $processes | ForEach-Object {
        $pid = $_
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Killing PID $pid ($($proc.ProcessName))..."
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "  Could not kill PID $pid"
        }
    }
    Write-Host "✅ Done! Port $port should now be free."
} else {
    Write-Host "ℹ️  No processes found using port $port"
}

# Wait a moment
Start-Sleep -Seconds 1

# Verify
$stillInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($stillInUse) {
    Write-Host "⚠️  Port $port is still in use. Try running as Administrator."
} else {
    Write-Host "✅ Port $port is now free!"
}
