import time
import hmac
import json
import hashlib
import requests
import modal
from typing import Optional
from modal import fastapi_endpoint as web_endpoint

app = modal.App("mcp_gpu_tasks")

image = modal.Image.debian_slim().pip_install(
    "requests",
    "fastapi[standard]"
)


@app.function(image=image, gpu="A10G", timeout=900)
def run_llm_task(payload: dict, callback_url: str, webhook_secret: Optional[str] = None):
    # Simulated heavy work (replace with actual LLM inference)
    time.sleep(2)
    result = {
        "echo": payload,
        "processed_at": int(time.time()),
        "notes": "Replace with HF/LLM inference and stream partials via chunked callbacks if desired.",
    }

    body = json.dumps({"ok": True, "result": result})
    headers = {"content-type": "application/json"}
    if webhook_secret:
        signature = hmac.new(webhook_secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
        headers["x-signature"] = signature

    try:
        requests.post(callback_url, headers=headers, data=body, timeout=10)
    except Exception as e:
        # Best-effort; in production add retry/backoff
        print(f"Callback POST failed: {e}")


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


