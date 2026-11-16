"""Safe file storage for evidence images. Paths are always built from server-generated names."""
import uuid
from pathlib import Path


class StorageError(Exception):
    pass


def new_stored_filename(extension: str) -> str:
    return f"{uuid.uuid4().hex}.{extension.lstrip('.')}"


def safe_join(base: Path, filename: str) -> Path:
    """Resolve `filename` inside `base`, refusing anything that could escape it."""
    if (
        not filename
        or filename in (".", "..")
        or "/" in filename
        or "\\" in filename
        or "\x00" in filename
    ):
        raise StorageError("Unsafe file name")
    base_resolved = base.resolve()
    target = (base_resolved / filename).resolve()
    if target.parent != base_resolved:
        raise StorageError("Path escapes storage directory")
    return target


def write_new_file(base: Path, filename: str, data: bytes) -> Path:
    """Create a new file; refuses to overwrite an existing one ("x" mode)."""
    base.mkdir(parents=True, exist_ok=True)
    target = safe_join(base, filename)
    with open(target, "xb") as handle:
        handle.write(data)
    return target


def delete_quietly(path: Path | None) -> None:
    if path is None:
        return
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
