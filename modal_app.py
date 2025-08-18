import time
import hmac
import json
import uuid
import hashlib
import modal
import random
from typing import Optional
from modal import fastapi_endpoint as web_endpoint, Retries
import os

app = modal.App("mcp_gpu_tasks")

image = modal.Image.debian_slim().pip_install(
    "requests",
    "fastapi[standard]"
)


# --- GPU selection (default L4; override with env MODAL_GPU=A10G|A100|T4|L4) ---
GPU_CHOICE = os.getenv("MODAL_GPU", "A10G").upper()
if GPU_CHOICE == "A100":
    GPU_CONF = modal.gpu.A100()
elif GPU_CHOICE == "A10G":
    GPU_CONF = modal.gpu.A10G()
elif GPU_CHOICE == "T4":
    GPU_CONF = modal.gpu.T4()
else:
    GPU_CONF = modal.gpu.L4()

KEEP_WARM = int(os.getenv("MODAL_KEEP_WARM", "1"))


@app.function(
    image=image,
    timeout=1800,
    retries=Retries(max_retries=3, backoff_coefficient=2.0, initial_delay=1.0, max_delay=30.0),
    keep_warm=KEEP_WARM,
)
def run_llm_task(payload: dict, callback_url: str, webhook_secret: Optional[str] = None):
    # Lazy import to avoid local import error during modal deploy parsing
    import requests
    correlation_id = payload.get("correlation_id") or str(uuid.uuid4())
    model = payload.get("model") or os.getenv("LANGDB_MODEL") or "gpt-5-mini"
    # Build LangDB endpoint
    chat_path = "/v1/chat/completions"
    base_raw = (
        payload.get("langdb_chat_url")
        or payload.get("langdb_endpoint")
        or payload.get("ai_gateway_url")
        or payload.get("langdb_base_url")
    ) or ""
    base = str(base_raw).rstrip("/")
    # If caller provided full endpoint already including chat_path, use as-is
    if base.endswith(chat_path):
        url = base
    elif base.endswith("/v1"):
        url = base + "/chat/completions"
    elif base:
        url = base + chat_path
    else:
        url = "https://api.us-east-1.langdb.ai/v1/chat/completions"

    # Debug: expose chosen final URL for logs (trim to avoid leaking secrets)
    print(f"[run_llm_task] final url={url[:200]} model={model} gpu={GPU_CHOICE} keep_warm={KEEP_WARM}")

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {payload.get('langdb_api_key') or payload.get('langdb_key')}",
        "X-Project-Id": payload.get("langdb_project_id", ""),
    }
    body_req = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Return ONLY a JSON array with 3 objects: {\"step_description\": string, \"progress_pct\": number}."},
            {"role": "user", "content": f"Produce steps for: {payload.get('thought','')}"},
        ],
        "stream": False,
    }

    # Model-aware param filtering: omit temperature/top_p for gpt-5 unless explicitly allowed
    is_gpt5 = str(model).lower().startswith('gpt-5') or 'gpt-5-mini' in str(model).lower()
    allow_nondefault_temp = str(os.getenv('LANGDB_ALLOW_NONDEFAULT_TEMPERATURE', 'false')).lower() == 'true'

    if not is_gpt5:
        body_req["temperature"] = float(payload.get('temperature', os.getenv('LANGDB_TEMPERATURE', '0.2')))
        body_req["top_p"] = float(payload.get('top_p', os.getenv('LANGDB_TOP_P', '1')))
    else:
        if allow_nondefault_temp:
            # enforce model-allowed default values
            body_req["temperature"] = float(os.getenv('LANGDB_TEMPERATURE', '1'))
            body_req["top_p"] = float(os.getenv('LANGDB_TOP_P', '1'))

    # Configurable timeout and retry for LangDB requests
    langdb_timeout = int(os.getenv('LANGDB_TIMEOUT', '30'))
    langdb_retries = int(os.getenv('LANGDB_RETRIES', '3'))
    langdb_base_delay = float(os.getenv('LANGDB_RETRY_BASE_DELAY', '2'))
    result = None
    error = None
    ok = True
    for attempt in range(1, langdb_retries + 1):
        try:
            print(f"[run_llm_task] cid={correlation_id} calling LangDB (attempt {attempt}/{langdb_retries}): {url} model={model} timeout={langdb_timeout}s")
            t0 = time.time()
            resp = requests.post(url, headers=headers, json=body_req, timeout=langdb_timeout)
            elapsed = (time.time() - t0) * 1000.0
            print(f"[run_llm_task] cid={correlation_id} LangDB elapsed_ms={elapsed:.1f}")
            print(f"[run_llm_task] cid={correlation_id} LangDB response status={resp.status_code} text={repr(resp.text[:400])}")
            if 200 <= resp.status_code < 300:
                try:
                    full = resp.json()
                    # Try to extract assistant content (OpenAI-like shape)
                    content = None
                    try:
                        content = full.get('choices', [])[0].get('message', {}).get('content')
                    except Exception:
                        content = None

                    parsed_steps = None
                    if isinstance(content, str) and content.strip():
                        # Remove triple-backtick fences and optional language markers
                        text = content.strip()
                        if text.startswith('```'):
                            # strip first and last code fences
                            try:
                                # find last ``` occurrence
                                last = text.rfind('```')
                                if last > 0:
                                    # remove leading ```...\n and trailing ```
                                    # find first newline after opening fence
                                    first_nl = text.find('\n')
                                    if first_nl != -1:
                                        inner = text[first_nl+1:last]
                                    else:
                                        inner = text[3:last]
                                else:
                                    inner = text
                            except Exception:
                                inner = text
                        else:
                            inner = text

                        # Attempt to extract JSON array from inner
                        try:
                            start = inner.find('[')
                            end = inner.rfind(']')
                            if start != -1 and end != -1 and end > start:
                                json_slice = inner[start:end+1]
                                parsed = json.loads(json_slice)
                                if isinstance(parsed, list):
                                    parsed_steps = parsed
                        except Exception as e_parse:
                            print(f"[run_llm_task] cid={correlation_id} failed to parse embedded JSON: {e_parse}")

                    # If we have parsed steps, return them; otherwise return the full response
                    if parsed_steps is not None:
                        result = parsed_steps
                    else:
                        result = full

                    error = None
                    ok = True
                    break
                except Exception as parse_err:
                    ok = False
                    error = f"LangDB JSON parse error: {parse_err}"
                    print(f"[run_llm_task] cid={correlation_id} parse error: {parse_err}")
            else:
                ok = False
                error = f"LangDB HTTP {resp.status_code}: {resp.text[:512]}"
                print(f"[run_llm_task] cid={correlation_id} non-2xx response: {resp.status_code}")
        except Exception as e:
            ok = False
            error = str(e)
            print(f"[run_llm_task] cid={correlation_id} LangDB request exception: {e}")

        # Retry if not last attempt
        if attempt < langdb_retries:
            delay = min(langdb_base_delay * (2 ** (attempt - 1)), 60)
            jitter = random.uniform(0, delay * 0.1)
            sleep_time = delay + jitter
            print(f"[run_llm_task] cid={correlation_id} retrying LangDB in {sleep_time:.2f}s (attempt {attempt + 1}/{langdb_retries})")
            time.sleep(sleep_time)
    # End retry loop
    if result is None and error is None:
        error = 'LangDB request failed without error message'

    # Include LangDB outcome in callback payload to aid Router diagnosis
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

    # Cost calculation and reporting to Railway analytics
    try:
        railway_analytics_url = os.environ.get("RAILWAY_ANALYTICS_URL")
        railway_analytics_key = os.environ.get("RAILWAY_ANALYTICS_KEY")
        
        if railway_analytics_url and railway_analytics_key:
            input_tokens = full.get("usage", {}).get("prompt_tokens", 0) if isinstance(full, dict) else 0
            output_tokens = full.get("usage", {}).get("completion_tokens", 0) if isinstance(full, dict) else 0
            total_tokens = input_tokens + output_tokens
            
            # Simple cost estimation (adjust as per actual model pricing)
            price_per_1k = float(os.environ.get("LANGDB_PRICE_PER_1K", 0.03))
            cost_usd = round((total_tokens / 1000) * price_per_1k, 6)
            
            print(f"[Modal] Reporting cost to Railway: {cost_usd} USD for {total_tokens} tokens")
            
            requests.post(
                railway_analytics_url,
                json={
                    "service_name": "langdb",
                    "operation_type": model,
                    "tokens_used": total_tokens,
                    "cost_usd": cost_usd,
                    "session_id": payload.get("session_id"),
                    "request_id": correlation_id,
                    "meta": {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "modal_run_id": os.environ.get("MODAL_TASK_ID"),
                        "modal_stub_name": os.environ.get("MODAL_JOB_ID"),
                    }
                },
                headers={
                    "X-Analytics-Ingest-Key": railway_analytics_key,
                    "Content-Type": "application/json"
                },
                timeout=5 # Short timeout to avoid blocking
            )
        else:
            print("[Modal] Skipping cost reporting: RAILWAY_ANALYTICS_URL or RAILWAY_ANALYTICS_KEY not set")
    except Exception as e:
        print(f"[Modal] Error reporting cost: {e}")
        # Log to error analytics on Railway if possible, but don't block main flow
        try:
            if railway_analytics_url and railway_analytics_key:
                requests.post(
                    railway_analytics_url.replace("/costs", "/errors"), # Use the errors endpoint
                    json={
                        "session_id": payload.get("session_id"),
                        "error_type": "modal_cost_reporting_error",
                        "error_message": str(e),
                        "context": {"correlation_id": correlation_id, "modal_task_id": os.environ.get("MODAL_TASK_ID")}
                    },
                    headers={
                        "X-Analytics-Ingest-Key": railway_analytics_key,
                        "Content-Type": "application/json"
                    },
                    timeout=5
                )
        except Exception as inner_e:
            print(f"[Modal] Failed to log error about cost reporting: {inner_e}")

    # Retry with exponential backoff + jitter
    max_retries = 5
    base_delay = 0.5
    success = False
    for attempt in range(1, max_retries + 1):
        try:
            print(f"[run_llm_task] cid={correlation_id} posting callback attempt={attempt} to {callback_url}")
            r = requests.post(callback_url, headers=headers_cb, data=callback_body, timeout=10)
            # Log response status and truncated body for debugging
            try:
                resp_text = r.text
            except Exception:
                resp_text = '<no-text>'
            print(f"[run_llm_task] cid={correlation_id} callback response status={r.status_code} text={repr(resp_text[:400])}")
            if r.status_code in (200, 201, 202):
                success = True
                break
            else:
                print(f"[run_llm_task] cid={correlation_id} callback non-2xx status: {r.status_code}")
        except Exception as e:
            print(f"[run_llm_task] cid={correlation_id} callback exception: {e}")

        if attempt < max_retries:
            delay = min(base_delay * (2 ** (attempt - 1)), 30)
            jitter = random.uniform(0, delay * 0.1)
            sleep_time = delay + jitter
            print(f"[run_llm_task] cid={correlation_id} retrying callback in {sleep_time:.2f}s (attempt {attempt+1}/{max_retries})")
            time.sleep(sleep_time)

    if not success:
        print(f"[run_llm_task] cid={correlation_id} final callback POST failed after {max_retries} attempts")


@app.function(image=image)
@web_endpoint(method="POST")
def submit(body: dict):
    payload = body.get("payload", {})
    callback_url = body.get("callback_url")
    webhook_secret = body.get("webhook_secret")
    corr = body.get("correlation_id")
    if corr:
        try:
            payload["correlation_id"] = corr
        except Exception:
            pass
    if not callback_url:
        return {"ok": False, "error": "Missing callback_url"}
    run_llm_task.spawn(payload, callback_url, webhook_secret)
    return {"ok": True}


@app.local_entrypoint()
def main():
    # Local sanity check: send a job that calls back to local Railway dev server
    cb = "http://localhost:3000/webhook/modal"
    run_llm_task.remote({"hello": "world"}, cb)


