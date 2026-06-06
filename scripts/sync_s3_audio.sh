#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${1:-/Users/ibrahimakhoule/Downloads/Ibrahima Diagne}"
BUCKET="${S3_BUCKET:-ibrahima-diagne-bucket}"
REGION="${AWS_REGION:-us-east-1}"
AWS_CLI="${AWS_CLI:-aws}"
MAX_YEAR="${MAX_YEAR:-9999}"

if ! command -v "$AWS_CLI" >/dev/null 2>&1; then
  if [ -x "$HOME/Library/Python/3.9/bin/aws" ]; then
    AWS_CLI="$HOME/Library/Python/3.9/bin/aws"
  else
  echo "AWS CLI est introuvable. Installe awscli puis relance ce script." >&2
  exit 1
  fi
fi

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Dossier introuvable: $SOURCE_DIR" >&2
  exit 1
fi

find "$SOURCE_DIR" -maxdepth 1 -type d -name "Ibrahima Diagne *" | sort | while IFS= read -r album_dir; do
  album_name="$(basename "$album_dir")"
  year="$(printf "%s" "$album_name" | sed -E 's/.* ([0-9]{4})$/\1/')"

  if ! printf "%s" "$year" | grep -Eq '^[0-9]{4}$'; then
    echo "Année ignorée pour: $album_name" >&2
    continue
  fi

  if [ "$year" -gt "$MAX_YEAR" ]; then
    echo "Année ignorée après $MAX_YEAR: $album_name"
    continue
  fi

  prefix="ibrahima-diagne-$year"
  echo "Upload $album_name -> s3://$BUCKET/$prefix/"

  find "$album_dir" -maxdepth 1 -type f -iname "*.mp3" | sort | while IFS= read -r audio_file; do
    file_name="$(basename "$audio_file")"
    "$AWS_CLI" s3 cp "$audio_file" "s3://$BUCKET/$prefix/$file_name" \
      --region "$REGION" \
      --content-type "audio/mpeg" \
      --no-progress
  done
done
