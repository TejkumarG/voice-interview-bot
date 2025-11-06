"""Hash utility for file identification."""

import hashlib


def compute_file_hash(text: str) -> str:
    """Compute SHA256 hash of file content."""
    hash_obj = hashlib.sha256(text.encode('utf-8'))
    return hash_obj.hexdigest()[:16]


def extract_title_from_content(text: str, max_length: int = 50) -> str:
    """Extract title from document content."""
    # Get first line
    first_line = text.split('\n')[0].strip()

    # Remove markdown headers
    first_line = first_line.lstrip('#').strip()

    # Truncate if too long
    if len(first_line) > max_length:
        first_line = first_line[:max_length] + "..."

    # Fallback if empty
    if not first_line:
        first_line = "Untitled Document"

    return first_line
