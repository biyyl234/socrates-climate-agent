# Socrates edge-function self-test (anonymous, real HTTP).
# Runs every endpoint against the deployed cloud project and saves raw request/
# response evidence under test-evidence/. No mutation of lockfiles or git state.

$ErrorActionPreference = "Stop"

$base = "https://eaarnvyzcrpjhvrghmal.supabase.co/functions/v1"
$rest = "https://eaarnvyzcrpjhvrghmal.supabase.co/rest/v1"
$key = "sb_publishable_tl1DclMQ386jjwPoxwjt1Q_TTnzPNEN"
$outDir = Join-Path $PSScriptRoot "..\test-evidence"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$headers = @{ apikey = $key; Authorization = "Bearer $key" }

function Save-Evidence($name, $status, $contentType, $body, $note) {
  $record = [ordered]@{
    note = $note
    status = $status
    content_type = $contentType
    body = $body
  }
  $path = Join-Path $outDir "$name.json"
  $record | ConvertTo-Json -Depth 12 | Set-Content -Path $path -Encoding utf8
  "{0,-34} {1}  {2}" -f $name, $status, $contentType
}

function Invoke-Json($method, $url, $bodyObj) {
  $params = @{ Uri = $url; Method = $method; Headers = $headers; SkipHttpErrorCheck = $true }
  if ($null -ne $bodyObj) {
    $params.ContentType = "application/json; charset=utf-8"
    $params.Body = ($bodyObj | ConvertTo-Json -Depth 8)
  }
  return Invoke-WebRequest @params
}

# ---------------- /chat ----------------
$chatValid = Invoke-Json "POST" "$base/chat" @{
  message = "今天食堂牛肉套餐和素套餐哪个碳排放更低？"
  mode = "demo"
  locale = "zh-CN"
}
$events = ([regex]::Matches($chatValid.Content, "event: ([^\r\n]+)") | ForEach-Object { $_.Groups[1].Value })
Save-Evidence "chat_valid" $chatValid.StatusCode $chatValid.Headers["Content-Type"] $chatValid.Content "SSE compare flow; event order: $($events -join ', ')"

$chatBad = Invoke-Json "POST" "$base/chat" @{ message = "" }
Save-Evidence "chat_invalid" $chatBad.StatusCode $chatBad.Headers["Content-Type"] $chatBad.Content "Empty message -> INVALID_PAYLOAD"

$chatGuarded = Invoke-Json "POST" "$base/chat" @{ message = "我们聊聊政治政策和领导人吧" }
$guardedEvents = ([regex]::Matches($chatGuarded.Content, "event: ([^\r\n]+)") | ForEach-Object { $_.Groups[1].Value })
Save-Evidence "chat_guarded" $chatGuarded.StatusCode $chatGuarded.Headers["Content-Type"] $chatGuarded.Content "Hard sensitive topic -> GUARDED; events: $($guardedEvents -join ', ')"

# ---------------- /tts ----------------
$ttsOk = Invoke-Json "POST" "$base/tts" @{
  session_id = "sess_test"
  text = "我们先看看两份套餐的差异，再聊你愿意尝试的小改变。"
  locale = "zh-CN"
  format = "audio/mp3"
}
Save-Evidence "tts_valid" $ttsOk.StatusCode $ttsOk.Headers["Content-Type"] $ttsOk.Content "No TTS credentials -> resilient NoTTS subtitle fallback"

$ttsBad = Invoke-Json "POST" "$base/tts" @{ text = "" }
Save-Evidence "tts_invalid" $ttsBad.StatusCode $ttsBad.Headers["Content-Type"] $ttsBad.Content "Empty text -> INVALID_PAYLOAD"

# ---------------- /product ----------------
$prodBarcode = Invoke-WebRequest "$base/product?barcode=0000000000000" -Headers $headers -SkipHttpErrorCheck
Save-Evidence "product_barcode_miss" $prodBarcode.StatusCode $prodBarcode.Headers["Content-Type"] $prodBarcode.Content "Unknown barcode -> PRODUCT_NOT_FOUND"

$prodQuery = Invoke-WebRequest "$base/product?query=chocolate" -Headers $headers -SkipHttpErrorCheck
Save-Evidence "product_query" $prodQuery.StatusCode $prodQuery.Headers["Content-Type"] $prodQuery.Content "OFF keyword proxy"

$prodCategory = Invoke-WebRequest "$base/product?category=snack" -Headers $headers -SkipHttpErrorCheck
Save-Evidence "product_category" $prodCategory.StatusCode $prodCategory.Headers["Content-Type"] $prodCategory.Content "Local snapshot category lookup"

# ---------------- /lca ----------------
$lcaOk = Invoke-Json "POST" "$base/lca" @{
  category_id = "meal_beef"
  attributes = @{ portion_g = 350; geography = "CN" }
  quantity = 1
  unit = "meal"
}
Save-Evidence "lca_valid" $lcaOk.StatusCode $lcaOk.Headers["Content-Type"] $lcaOk.Content "Deterministic LCA card"

$lcaBadCategory = Invoke-Json "POST" "$base/lca" @{ category_id = "nope"; attributes = @{}; quantity = 1; unit = "meal" }
Save-Evidence "lca_bad_category" $lcaBadCategory.StatusCode $lcaBadCategory.Headers["Content-Type"] $lcaBadCategory.Content "Unknown category -> INVALID_PAYLOAD"

$lcaBadUnit = Invoke-Json "POST" "$base/lca" @{ category_id = "meal_beef"; attributes = @{}; quantity = 1; unit = "foot" }
Save-Evidence "lca_bad_unit" $lcaBadUnit.StatusCode $lcaBadUnit.Headers["Content-Type"] $lcaBadUnit.Content "Bad unit -> INVALID_PAYLOAD"

# ---------------- /compare ----------------
$cmpOk = Invoke-Json "POST" "$base/compare" @{
  items = @(
    @{ label = "牛肉套餐"; category_id = "meal_beef"; attributes = @{ portion_g = 350 } },
    @{ label = "素食套餐"; category_id = "meal_veggie"; attributes = @{ portion_g = 350 } }
  )
  alternatives = @(@{ label = "自带餐盒"; category_id = "packaging_reusable" })
}
Save-Evidence "compare_valid" $cmpOk.StatusCode $cmpOk.Headers["Content-Type"] $cmpOk.Content "Same functional unit compare with overlap judgment, ranking, 5R"

$cmpBad = Invoke-Json "POST" "$base/compare" @{ items = @(@{ label = "only"; category_id = "meal_beef" }) }
Save-Evidence "compare_invalid" $cmpBad.StatusCode $cmpBad.Headers["Content-Type"] $cmpBad.Content "Single item -> INVALID_PAYLOAD"

# ---------------- /commitment ----------------
$cmOk = Invoke-Json "POST" "$base/commitment" @{
  session_id = "sess_test"
  commitment_text = "本周午餐选两次素食套餐"
  category_id = "meal_veggie"
  alternative = "素食套餐替代牛肉套餐"
  barrier = "口味偏好"
  plan = "先从半荤半素组合尝试"
  self_efficacy = 4
  follow_up_days = 7
  consent = $true
}
Save-Evidence "commitment_consented" $cmOk.StatusCode $cmOk.Headers["Content-Type"] $cmOk.Content "Consent recorded"

$cmNoConsent = Invoke-Json "POST" "$base/commitment" @{
  commitment_text = "下次自带水杯"
  category_id = "bottled_water"
  alternative = "直饮水替代瓶装水"
  self_efficacy = 3
  follow_up_days = 14
}
Save-Evidence "commitment_no_consent" $cmNoConsent.StatusCode $cmNoConsent.Headers["Content-Type"] $cmNoConsent.Content "No consent flag -> consent_recorded=false"

$cmBad = Invoke-Json "POST" "$base/commitment" @{
  commitment_text = "x"
  alternative = "y"
  self_efficacy = 9
}
Save-Evidence "commitment_invalid" $cmBad.StatusCode $cmBad.Headers["Content-Type"] $cmBad.Content "self_efficacy=9 -> INVALID_PAYLOAD"

# ---------------- RLS / anonymous REST ----------------
$restPublic = Invoke-WebRequest "$rest/products?select=*" -Headers $headers -SkipHttpErrorCheck
Save-Evidence "rls_products_read" $restPublic.StatusCode $restPublic.Headers["Content-Type"] $restPublic.Content "Reference table anonymous select"

$restFactors = Invoke-WebRequest "$rest/emission_factors?select=*" -Headers $headers -SkipHttpErrorCheck
Save-Evidence "rls_factors_read" $restFactors.StatusCode $restFactors.Headers["Content-Type"] $restFactors.Content "Reference table anonymous select"

$restCommit = Invoke-WebRequest "$rest/commitments?select=*" -Headers $headers -SkipHttpErrorCheck
Save-Evidence "rls_commitments_anon" $restCommit.StatusCode $restCommit.Headers["Content-Type"] $restCommit.Content "Personal table anonymous select must be empty"

$restEvents = Invoke-WebRequest "$rest/footprint_events?select=*" -Headers $headers -SkipHttpErrorCheck
Save-Evidence "rls_events_anon" $restEvents.StatusCode $restEvents.Headers["Content-Type"] $restEvents.Content "Personal table anonymous select must be empty"

$restPost = Invoke-WebRequest "$rest/commitments" -Method POST -Headers $headers -ContentType "application/json" -Body (@{
  session_id = "sess_rest_anon"; commitment_text = "should be blocked"; alternative = "x"
} | ConvertTo-Json) -SkipHttpErrorCheck
Save-Evidence "rls_commitments_anon_write" $restPost.StatusCode $restPost.Headers["Content-Type"] $restPost.Content "Anonymous direct REST write blocked by RLS"

Write-Host "`nEvidence saved to $outDir"
