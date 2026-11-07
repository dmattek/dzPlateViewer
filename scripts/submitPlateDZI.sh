#!/usr/bin/env bash
#
# Submit one SLURM array job (3 tasks, one per channel) per plate folder.
#
# Usage:
#   ./submitPlateDZI.sh [-s PYSCRIPT] OUTROOT INDIR [INDIR ...]
#
#   OUTROOT  root output folder; DZI tiling of each plate goes to OUTROOT/<basename of INDIR>
#   INDIR    folder with all images (96 wells, channels 1-3) of a single plate
#   -s       path to the montage python script
#            (default: makePlateMontageDZI.py in the same folder as this script)
#   -h       show this help
#
# SLURM logs are written to ./slurm.out/ in the directory you submit from.

set -euo pipefail

SCRIPTDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JOBSCRIPT="$SCRIPTDIR/plateDZI.slurm"
PYSCRIPT="$SCRIPTDIR/makePlateMontageDZI.py"

usage() {
    sed -n '3,14p' "$0" | sed 's/^# \{0,1\}//'
}

while getopts ":s:h" opt; do
    case "$opt" in
        s) PYSCRIPT="$OPTARG" ;;
        h) usage; exit 0 ;;
        \?) echo "Unknown option: -$OPTARG" >&2; usage; exit 1 ;;
        :)  echo "Option -$OPTARG requires an argument" >&2; exit 1 ;;
    esac
done
shift $((OPTIND - 1))

if [[ $# -lt 2 ]]; then
    usage
    exit 1
fi

OUTROOT="$1"
shift

# Jobs run from a spooled copy of the job script, so pass absolute paths
for f in "$PYSCRIPT" "$JOBSCRIPT"; do
    if [[ ! -f "$f" ]]; then
        echo "Error: file not found: $f" >&2
        exit 1
    fi
done
PYSCRIPT="$(cd "$(dirname "$PYSCRIPT")" && pwd)/$(basename "$PYSCRIPT")"

# Validate all input folders and check for clashing output names before submitting anything
declare -A SEEN
for indir in "$@"; do
    if [[ ! -d "$indir" ]]; then
        echo "Error: input folder not found: $indir" >&2
        exit 1
    fi
    name="$(basename "$(cd "$indir" && pwd)")"
    if [[ -n "${SEEN[$name]:-}" ]]; then
        echo "Error: input folders '${SEEN[$name]}' and '$indir' would both write to $OUTROOT/$name" >&2
        exit 1
    fi
    SEEN[$name]="$indir"
done

mkdir -p slurm.out "$OUTROOT"
OUTROOT="$(cd "$OUTROOT" && pwd)"

for indir in "$@"; do
    indir="$(cd "$indir" && pwd)"
    outdir="$OUTROOT/$(basename "$indir")"
    mkdir -p "$outdir"

    jobid=$(sbatch --parsable "$JOBSCRIPT" "$PYSCRIPT" "$indir" "$outdir")
    echo "Submitted array job $jobid: $indir -> $outdir"
done
