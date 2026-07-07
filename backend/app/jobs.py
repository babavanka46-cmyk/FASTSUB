from __future__ import annotations

import uuid
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import Future
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Callable

from fastapi.encoders import jsonable_encoder

JobCallable = Callable[[], Any]

import os
MAX_WORKERS = int(os.getenv("FASTSUB_JOB_WORKERS", "4"))
_EXECUTOR = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="fastsub-job")
_JOBS: dict[str, dict[str, Any]] = {}
_FUTURES: dict[str, Future[Any]] = {}
_LOCK = Lock()
MAX_STORED_JOBS = 100


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def start_job(kind: str, run: JobCallable) -> dict[str, Any]:
    job_id = uuid.uuid4().hex[:12]
    now = utc_now()
    with _LOCK:
        _JOBS[job_id] = {
            "id": job_id,
            "kind": kind,
            "status": "queued",
            "message": "Queued",
            "result": None,
            "error": None,
            "created_at": now,
            "updated_at": now,
        }
        _prune_jobs_locked()
    future = _EXECUTOR.submit(_run_job, job_id, run)
    with _LOCK:
        _FUTURES[job_id] = future
    return get_job(job_id)


def get_job(job_id: str) -> dict[str, Any] | None:
    with _LOCK:
        job = _JOBS.get(job_id)
        return dict(job) if job else None


def cancel_job(job_id: str) -> dict[str, Any] | None:
    with _LOCK:
        job = _JOBS.get(job_id)
        future = _FUTURES.get(job_id)
        if not job:
            return None
        if job["status"] != "queued" or not future or not future.cancel():
            return dict(job)
        job.update({
            "status": "cancelled",
            "message": "Cancelled",
            "result": None,
            "error": None,
            "updated_at": utc_now(),
        })
        _FUTURES.pop(job_id, None)
        return dict(job)


def _run_job(job_id: str, run: JobCallable) -> None:
    _update_job(job_id, status="running", message="Running")
    try:
        result = run()
        _update_job(
            job_id,
            status="succeeded",
            message="Complete",
            result=jsonable_encoder(result),
            error=None,
        )
    except Exception as exc:  # noqa: BLE001 - job boundary should capture all failures
        _update_job(job_id, status="failed", message="Failed", result=None, error=str(exc))


def _update_job(job_id: str, **patch: Any) -> None:
    with _LOCK:
        job = _JOBS.get(job_id)
        if not job:
            return
        job.update(patch)
        job["updated_at"] = utc_now()
        if job["status"] in {"succeeded", "failed", "cancelled"}:
            _FUTURES.pop(job_id, None)
        _prune_jobs_locked()


def _prune_jobs_locked() -> None:
    if len(_JOBS) <= MAX_STORED_JOBS:
        return
    removable = [
        job_id
        for job_id, job in sorted(_JOBS.items(), key=lambda item: item[1]["updated_at"])
        if job["status"] in {"succeeded", "failed"}
    ]
    for job_id in removable[: max(0, len(_JOBS) - MAX_STORED_JOBS)]:
        _JOBS.pop(job_id, None)
        _FUTURES.pop(job_id, None)
