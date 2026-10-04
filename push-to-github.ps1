# Script to push SplitFlow to GitHub once the repo is created at https://github.com/new
Write-Host "Pushing SplitFlow to git@github.com:sachinverma2003/splitflow.git..." -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 Successfully pushed to https://github.com/sachinverma2003/splitflow!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Please ensure you created an empty repo named 'splitflow' at https://github.com/new first." -ForegroundColor Yellow
}
