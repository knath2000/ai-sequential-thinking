import logging
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from threading import Lock
from typing import Deque, List, Optional


@dataclass
class LogRecordEntry:
    ts: datetime
    level: str
    name: str
    message: str


class InMemoryLogHandler(logging.Handler):
    def __init__(self, capacity: int = 1000):
        super().__init__()
        self.capacity = capacity
        self.buffer: Deque[LogRecordEntry] = deque(maxlen=capacity)
        self._lock = Lock()

    def emit(self, record: logging.LogRecord) -> None:
        try:
            entry = LogRecordEntry(
                ts=datetime.utcnow(),
                level=record.levelname,
                name=record.name,
                message=self.format(record),
            )
            with self._lock:
                self.buffer.append(entry)
        except Exception:
            # Never raise from logging handler
            pass

    def get_recent(self, limit: int = 200, level: Optional[str] = None) -> List[LogRecordEntry]:
        with self._lock:
            items = list(self.buffer)
        if level:
            level = level.upper()
            items = [e for e in items if e.level == level]
        return items[-limit:]


