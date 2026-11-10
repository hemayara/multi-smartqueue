import os
import sys
import subprocess

if __name__ == "__main__":
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")

    # Locate backend virtualenv Python interpreter
    venv_python_win = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    venv_python_posix = os.path.join(backend_dir, "venv", "bin", "python")

    if os.path.exists(venv_python_win):
        python_exe = venv_python_win
    elif os.path.exists(venv_python_posix):
        python_exe = venv_python_posix
    else:
        python_exe = sys.executable

    backend_run_script = os.path.join(backend_dir, "run.py")
    extra_args = sys.argv[1:] if len(sys.argv) > 1 else ["--seed"]
    args = [python_exe, backend_run_script] + extra_args

    # Run backend from the backend working directory
    sys.exit(subprocess.call(args, cwd=backend_dir))
