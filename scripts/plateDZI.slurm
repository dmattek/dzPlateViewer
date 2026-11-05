#!/bin/bash
#
# SLURM array job: build a DZI pyramid for one channel of one 96-well plate.
# Array task ID = image channel (0-2).
#
# Do not submit directly; use submitPlateDZI.sh, which passes:
#   $1  path to the montage python script (e.g. makePlateMontageDZI.py)
#   $2  input folder with the plate images
#   $3  output folder for the DZI tiling

#SBATCH --job-name=dz
#SBATCH --partition=all
#SBATCH --cpus-per-task=2
#SBATCH --mem=32G
#SBATCH --time=02:00:00
#SBATCH --array=0-2
#SBATCH --output=slurm.out/%x_%A_%a.out

set -euo pipefail

PYSCRIPT="$1"
INDIR="$2"
OUTDIR="$3"

CH="${SLURM_ARRAY_TASK_ID}"

# Intensity range for 16->8 bit rescaling, per channel
case "$CH" in
    0) IMIN=100; IMAX=4500 ;;
    1) IMIN=60;  IMAX=4500 ;;
    2) IMIN=100; IMAX=2200 ;;
    *) echo "Unexpected array task ID: $CH" >&2; exit 1 ;;
esac

# Activate the micromamba environment. The shell hook must be evaluated first,
# otherwise `micromamba activate` fails with "can't modify the parent shell".
MICROMAMBA="$HOME/.local/bin/micromamba"
eval "$("$MICROMAMBA" shell hook --shell bash)"
micromamba activate dz

echo "Host:       $(hostname)"
echo "Job:        ${SLURM_ARRAY_JOB_ID}_${SLURM_ARRAY_TASK_ID}"
echo "Python:     $(which python)"
echo "Script:     $PYSCRIPT"
echo "Input dir:  $INDIR"
echo "Output dir: $OUTDIR"
echo "Channel:    $CH (intensities $IMIN - $IMAX)"
echo "Start:      $(date)"

python "$PYSCRIPT" \
    -p 12 8 \
    -w 4 4 \
    -m 2048 2048 \
    -t 254 \
    -x tif \
    -c "$CH" \
    -I "$IMIN" "$IMAX" \
    -f "d${CH}" \
    -o "$OUTDIR" \
    "$INDIR"

echo "End:        $(date)"
