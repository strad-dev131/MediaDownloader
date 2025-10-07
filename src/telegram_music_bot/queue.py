from dataclasses import dataclass, field
from typing import List, Optional

from .downloader import TrackInfo


@dataclass
class PlaybackQueue:
    chat_id: int
    items: List[TrackInfo] = field(default_factory=list)
    max_size: int = 20

    def add(self, track: TrackInfo) -> bool:
        if len(self.items) >= self.max_size:
            return False
        self.items.append(track)
        return True

    def pop_next(self) -> Optional[TrackInfo]:
        if not self.items:
            return None
        return self.items.pop(0)

    def clear(self):
        self.items.clear()

    def __len__(self) -> int:
        return len(self.items)

    def snapshot(self) -> List[str]:
        return [f"{i+1}. {t.title}" for i, t in enumerate(self.items)]