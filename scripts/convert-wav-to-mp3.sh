#!/bin/bash

# Convert all WAV files in assets/ to MP3
# Requires: ffmpeg (install via: brew install ffmpeg)

ASSETS_DIR="../assets"

if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg not found. Install it first:"
    echo "   brew install ffmpeg"
    exit 1
fi

echo "🎵 Converting WAV files to MP3..."

find "$ASSETS_DIR" -type f -name "*.wav" -o -name "*.WAV" | while read -r wav_file; do
    mp3_file="${wav_file%.*}.mp3"

    if [ -f "$mp3_file" ]; then
        echo "⊘ Skipping (MP3 exists): $(basename "$mp3_file")"
        continue
    fi

    echo "⬇️  Converting: $(basename "$wav_file")"
    ffmpeg -i "$wav_file" -codec:a libmp3lame -qscale:a 2 "$mp3_file" -y -loglevel error

    if [ $? -eq 0 ]; then
        echo "✓ Created: $(basename "$mp3_file")"
        # Optionally remove WAV after conversion
        # rm "$wav_file"
    else
        echo "✗ Failed: $(basename "$wav_file")"
    fi
done

echo ""
echo "✅ Conversion complete!"
echo ""
echo "To remove original WAV files, uncomment the 'rm' line in this script."
