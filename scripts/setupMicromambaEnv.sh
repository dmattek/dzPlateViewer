#!/usr/bin/env bash
#
# Create a micromamba environment for the Deep Zoom Plate Viewer Python scripts.
#
# Usage:
#   ./scripts/setupMicromambaEnv.sh [-n ENV_NAME] [-p PYTHON_VERSION] [-f]
#
#   -n  environment name (default: dz)
#   -p  Python version (default: 3.13)
#   -f  force: remove and recreate the environment if it already exists
#   -h  show this help
#
# After creation, activate with:
#   micromamba activate dz

set -euo pipefail

ENV_NAME="dz"
PY_VER="3.13"
FORCE=0

usage() {
    sed -n '3,15p' "$0" | sed 's/^# \{0,1\}//'
}

while getopts ":n:p:fh" opt; do
    case "$opt" in
        n) ENV_NAME="$OPTARG" ;;
        p) PY_VER="$OPTARG" ;;
        f) FORCE=1 ;;
        h) usage; exit 0 ;;
        \?) echo "Unknown option: -$OPTARG" >&2; usage; exit 1 ;;
        :)  echo "Option -$OPTARG requires an argument" >&2; exit 1 ;;
    esac
done

# Packages required by makePlateMontageDZI.py and makePlateMontageDZI-multiCore.py
PACKAGES=(
    "python=${PY_VER}"
    "pip"
    "numpy"
    "pillow"
    "imageio"
    "joblib"   # only needed by makePlateMontageDZI-multiCore.py
)

if ! command -v micromamba >/dev/null 2>&1; then
    echo "Error: micromamba not found on PATH." >&2
    echo "Install it from https://mamba.readthedocs.io/en/latest/installation/micromamba-installation.html" >&2
    exit 1
fi

if micromamba env list | awk '{print $1}' | grep -qx "$ENV_NAME"; then
    if [[ $FORCE -eq 1 ]]; then
        echo "Removing existing environment '$ENV_NAME'..."
        micromamba env remove -y -n "$ENV_NAME"
    else
        echo "Environment '$ENV_NAME' already exists. Use -f to recreate it." >&2
        exit 1
    fi
fi

echo "Creating micromamba environment '$ENV_NAME' (Python ${PY_VER})..."
micromamba create -y -n "$ENV_NAME" -c conda-forge "${PACKAGES[@]}"

echo "Verifying installation..."
micromamba run -n "$ENV_NAME" python -c "
import sys, numpy, PIL, imageio, joblib
print('python ', sys.version.split()[0])
print('numpy  ', numpy.__version__)
print('pillow ', PIL.__version__)
print('imageio', imageio.__version__)
print('joblib ', joblib.__version__)
"

echo
echo "Done. Activate the environment with:"
echo "  micromamba activate $ENV_NAME"
