import time
import hmac
import json
import uuid
import hashlib
import modal
from typing import Optional
from modal import fastapi_endpoint as web_endpoint, Retries
import os

app = modal.App("mcp_gpu_tasks")

image = modal.Image.debian_slim().pip_install(
    "requests",
    "fastapi[standard]"
)


@app.function(image=image, timeout=900, retries=Retries(max_retries=3, backoff_coefficient=2.0, initial_delay=1.0, max_delay=30.0))
def run_llm_task(payload: dict, callback_url: str, webhook_secret: Optional[str] = None):
    # Lazy import to avoid local import error during modal deploy parsing
    import requests
    correlation_id = payload.get("correlation_id") or str(uuid.uuid4())
    model = payload.get("model") or os.getenv("LANGDB_MODEL") or "gpt-4o"
    # Build LangDB endpoint
    base = (
        payload.get("langdb_chat_url")
        or payload.get("langdb_endpoint")
        or payload.get("ai_gateway_url")
        or payload.get("langdb_base_url")
    )
    if base and base.endswith("/v1"):
        url = base + "/chat/completions"
    elif base:
        url = base.rstrip("/") + "/v1/chat/completions"
    else:
        url = "https://api.us-east-1.langdb.ai/v1/chat/completions"

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {payload.get('langdb_api_key') or payload.get('langdb_key')}",
        "X-Project-Id": payload.get("langdb_project_id", ""),
    }
    body_req = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a planner. Return JSON array of steps."},
            {"role": "user", "content": f"Produce steps for: {payload.get('thought','')}"},
        ],
        "stream": False,
    }

    ok = True
    result = None
    error = None
    try:
        print(f"[run_llm_task] cid={correlation_id} calling LangDB: {url} model={model}")
        resp = requests.post(url, headers=headers, json=body_req, timeout=15)
        if resp.status_code >= 200 and resp.status_code < 300:
            result = resp.json()
        else:
            ok = False
            error = f"LangDB HTTP {resp.status_code}: {resp.text[:256]}"
    except Exception as e:
        ok = False
        error = str(e)

    callback_body = json.dumps({
        "ok": ok,
        "correlation_id": correlation_id,
        "result": result,
        "error": error,
    })
    headers_cb = {"content-type": "application/json"}
    if webhook_secret:
        signature = hmac.new(webhook_secret.encode("utf-8"), callback_body.encode("utf-8"), hashlib.sha256).hexdigest()
        headers_cb["x-signature"] = signature

    # Retry/backoff up to 3 attempts
    backoffs = [0.2, 0.5, 1.0]
    for attempt, delay in enumerate(backoffs, start=1):
        try:
            print(f"[run_llm_task] cid={correlation_id} posting callback attempt={attempt} to {callback_url}")
            r = requests.post(callback_url, headers=headers_cb, data=callback_body, timeout=5)
            if r.status_code in (200, 201, 202):
                break
        except Exception as e:
            if attempt == len(backoffs):
                print(f"[run_llm_task] cid={correlation_id} final callback POST failed: {e}")
        time.sleep(delay)


@app.function(image=image)
@web_endpoint(method="POST")
def submit(body: dict):
    payload = body.get("payload", {})
    callback_url = body.get("callback_url")
    webhook_secret = body.get("webhook_secret")
    if not callback_url:
        return {"ok": False, "error": "Missing callback_url"}
    run_llm_task.spawn(payload, callback_url, webhook_secret)
    return {"ok": True}


@app.local_entrypoint()
def main():
    # Local sanity check: send a job that calls back to local Railway dev server
    cb = "http://localhost:3000/webhook/modal"
    run_llm_task.remote({"hello": "world"}, cb)


