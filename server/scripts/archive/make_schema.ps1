$input_file = "ecommerce_platform_schema.sql"
$output_file = "server\schema.sql"

$lines = Get-Content $input_file -Encoding UTF8
$result = @()

foreach ($line in $lines) {
    # Skip DROP TABLE, SET, LOCK, UNLOCK, and MySQL-specific comments
    if ($line -match "^DROP TABLE" -or 
        $line -match "^SET " -or 
        $line -match "^LOCK " -or 
        $line -match "^UNLOCK" -or
        $line -match "^/\*!" -or
        $line -match "^--$") {
        continue
    }
    
    # Convert CREATE TABLE `name` to CREATE TABLE IF NOT EXISTS `name`
    if ($line -match "^CREATE TABLE ``") {
        $line = $line -replace "^CREATE TABLE ``", "CREATE TABLE IF NOT EXISTS ``"
    }
    
    $result += $line
}

$result | Set-Content $output_file -Encoding UTF8
Write-Host "Done! Schema file created at $output_file"
Write-Host "Total lines: $($result.Count)"
