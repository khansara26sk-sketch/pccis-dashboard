"""Helpers for untrusted client-supplied file names."""
import unicodedata

MAX_DISPLAY_FILENAME_LENGTH = 255


def sanitize_display_filename(raw: str | None) -> str:
    """Return a safe name for *display only*. Stored files never use it.

    Drops any directory part (both / and \\), control characters and trailing dots/spaces.
    """
    if not raw:
        return "upload"
    name = raw.replace("\\", "/").split("/")[-1]
    name = "".join(ch for ch in name if not unicodedata.category(ch).startswith("C"))
    name = " ".join(name.split()).strip(" .")
    if not name:
        return "upload"
    if len(name) > MAX_DISPLAY_FILENAME_LENGTH:
        stem, dot, ext = name.rpartition(".")
        if dot and 0 < len(ext) <= 10:
            name = stem[: MAX_DISPLAY_FILENAME_LENGTH - len(ext) - 1] + "." + ext
        else:
            name = name[:MAX_DISPLAY_FILENAME_LENGTH]
    return name
