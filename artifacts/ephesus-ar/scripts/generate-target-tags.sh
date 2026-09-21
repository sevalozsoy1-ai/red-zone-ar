#!/usr/bin/env bash
set -euo pipefail

# Generates two printable A4 sheets (five ~9 cm target cards per sheet).
# The payloads are permanent and intentionally contain no room, player, or
# authentication information. Requires qrencode and ImageMagick's convert.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
OUT="${1:-$ROOT/downloads/red-zone-ar-target-tags}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

for n in $(seq 1 10); do
  printf -v id '%02d' "$n"
  qrencode -l H -m 4 -s 8 -o "$TMP/$id.png" "RZ:T:$id:1"
done

make_page() {
  local page="$1" start="$2" end="$3"
  local svg="$TMP/page-$page.svg"
  {
    echo '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="210mm" height="297mm" viewBox="0 0 794 1123">'
    echo '<rect width="794" height="1123" fill="white"/>'
    echo '<style>text{font-family:Arial,sans-serif} .cut{fill:none;stroke:#111;stroke-width:2;stroke-dasharray:8 5} .target{fill:none;stroke:#e31b23;stroke-width:5}</style>'
    local slot=0
    for n in $(seq "$start" "$end"); do
      local col row x y
      col=$((slot % 2))
      row=$((slot / 2))
      x=$((18 + col * 379))
      y=$((18 + row * 360))
      printf -v id '%02d' "$n"
      local data
      data="$(base64 -w0 "$TMP/$id.png")"
      cat <<EOF
<g transform="translate($x,$y)">
  <rect class="cut" x="0" y="0" width="360" height="340" rx="8"/>
  <text x="180" y="30" text-anchor="middle" font-size="22" font-weight="700">RED ZONE AR · OYUNCU $n</text>
  <rect class="target" x="45" y="48" width="270" height="270" rx="8"/>
  <circle class="target" cx="180" cy="183" r="135" opacity=".35"/>
  <image x="60" y="63" width="240" height="240" preserveAspectRatio="none" xlink:href="data:image/png;base64,$data"/>
  <text x="180" y="330" text-anchor="middle" font-size="13">Telefonun arkasına görünür biçimde yapıştırın</text>
</g>
EOF
      slot=$((slot + 1))
    done
    echo '<text x="397" y="1105" text-anchor="middle" font-size="12">Kamera hedefi: kırmızı nişangâh · tasarım mesafesi en fazla 5 m · gerçek cihaz testi gereklidir</text>'
    echo '</svg>'
  } > "$svg"
  convert -density 150 "$svg" -quality 95 "$OUT/red-zone-ar-target-tags-$page.pdf"
}

make_page 1 1 5
make_page 2 6 10
echo "Generated $OUT/red-zone-ar-target-tags-1.pdf and ...-2.pdf"