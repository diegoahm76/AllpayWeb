"""
RAG multi-archivo con Vector Store usando HTTP puro (sin SDK OpenAI)
- Auto-continue si la salida se corta por tokens (usa <END/> / <CONT/>)
- No cachea parciales; cachea solo la respuesta completa
- Une citas de todas las partes
"""

import os
import time
import json
import sqlite3
import hashlib
import logging
import requests
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# =========================
# CONFIGURACIÓN
# =========================
API_BASE = "https://api.openai.com/v1"
HTTP_TIMEOUT = 30

# Variables de entorno con defaults
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
MODEL = os.environ.get("OPENAI_MODEL", "gpt-5-mini")
REASONING_EFFORT = os.environ.get("OPENAI_REASONING_EFFORT", "low")  # "low" | "medium" | "high"
MAX_OUTPUT_TOKENS = int(os.environ.get("OPENAI_MAX_OUTPUT_TOKENS", "2000"))  # tope por llamada
MAX_CONTINUATIONS = int(os.environ.get("OPENAI_MAX_CONTINUATIONS", "4"))  # máximo saltos de continuación

VS_NAME = os.environ.get("OPENAI_VECTOR_STORE_NAME", "kb: manual allpay")
FORCE_NEW_VECTOR_STORE = os.environ.get("OPENAI_FORCE_NEW_VS", "False").lower() == "true"

# Archivos (IDs en tu cuenta) - desde variable de entorno separada por comas
TARGET_FILE_IDS_STR = os.environ.get("OPENAI_FILE_IDS", "")
TARGET_FILE_IDS = [fid.strip() for fid in TARGET_FILE_IDS_STR.split(",") if fid.strip()] if TARGET_FILE_IDS_STR else []

# Paths para caché (usando BASE_DIR de Django)
BASE_DIR = getattr(settings, 'BASE_DIR', os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VS_PATH = os.path.join(BASE_DIR, "vector_store_id.txt")
FILE_META_CACHE_PATH = os.path.join(BASE_DIR, "file_meta_cache.json")
SQLITE_PATH = os.path.join(BASE_DIR, "gpt_cache.db")

CACHE_TTL_SECONDS = 60 * 60 * 24  # 24h

# Sentinelas para cerrar/indicar continuar
END_SENT = "<END/>"
CONT_SENT = "<CONT/>"

ASSISTANT_INSTRUCTIONS = (
    "No respondas preguntas fuera del manual o del contexto de la aplicación; "
    "si ocurre, di que no estás autorizado. "
    "Responde SIEMPRE en pasos claros y concisos para un usuario final. "
    "Devuelve respuestas consisas, no mayores a 1500 caracteres. "
    "Sintetiza: no pegues texto literal del documento. "
    f"Límite por turno: {MAX_OUTPUT_TOKENS} tokens. "
    f"Si no alcanzas a terminar, DETÉN la salida con '{CONT_SENT}'. "
    f"Si alcanzas a terminar todo, finaliza con '{END_SENT}'. "
)

HEADERS = {
    "Authorization": f"Bearer {OPENAI_API_KEY}",
    "Content-Type": "application/json",
}

# =========================
# HTTP helpers
# =========================
def http_get(path: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    url = f"{API_BASE}{path}"
    r = requests.get(url, headers=HEADERS, params=params or {}, timeout=HTTP_TIMEOUT)
    if r.status_code >= 400:
        try:
            err = r.json()
        except Exception:
            err = {"error": {"message": r.text}}
        raise RuntimeError(f"GET {path} -> {r.status_code}: {err}")
    return r.json()

def http_post(path: str, body: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{API_BASE}{path}"
    r = requests.post(url, headers=HEADERS, json=body, timeout=HTTP_TIMEOUT)
    if r.status_code >= 400:
        try:
            err = r.json()
        except Exception:
            err = {"error": {"message": r.text}}
        raise RuntimeError(f"POST {path} -> {r.status_code}: {err}")
    return r.json()

# =========================
# Caché de respuestas (SQLite)
# =========================
def init_sqlite():
    conn = sqlite3.connect(SQLITE_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS qa_cache (
            key TEXT PRIMARY KEY,
            answer TEXT NOT NULL,
            sources_json TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def purge_empty_cache():
    conn = sqlite3.connect(SQLITE_PATH)
    try:
        conn.execute("DELETE FROM qa_cache WHERE TRIM(answer) = '' OR answer IS NULL")
        conn.commit()
    finally:
        conn.close()

def make_cache_key(question: str,
                   file_ids: List[str],
                   model: str,
                   reasoning_effort: str,
                   max_output_tokens: int,
                   instructions: str) -> str:
    payload = {
        "q": question.strip(),
        "files": sorted(file_ids),
        "model": model,
        "re": reasoning_effort,
        "max": max_output_tokens,
        "instr_hash": hashlib.sha1(instructions.encode("utf-8")).hexdigest(),
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()

def get_cached_answer(key: str) -> Optional[Tuple[str, List[Dict[str, Any]]]]:
    conn = sqlite3.connect(SQLITE_PATH)
    try:
        cur = conn.cursor()
        cur.execute("SELECT answer, sources_json, created_at FROM qa_cache WHERE key=?", (key,))
        row = cur.fetchone()
        if not row:
            return None
        answer, sources_json, created_at = row
        age = int(time.time()) - int(created_at)
        if age > CACHE_TTL_SECONDS or (answer is None or answer.strip() == ""):
            conn.execute("DELETE FROM qa_cache WHERE key=?", (key,))
            conn.commit()
            return None
        sources = json.loads(sources_json)
        return answer, sources
    finally:
        conn.close()

def put_cached_answer(key: str, answer: str, sources: List[Dict[str, Any]]):
    if answer is None or answer.strip() == "":
        return
    conn = sqlite3.connect(SQLITE_PATH)
    try:
        conn.execute(
            "REPLACE INTO qa_cache (key, answer, sources_json, created_at) VALUES (?, ?, ?, ?)",
            (key, answer, json.dumps(sources, ensure_ascii=False), int(time.time())),
        )
        conn.commit()
    finally:
        conn.close()

def cache_stats() -> Dict[str, Any]:
    conn = sqlite3.connect(SQLITE_PATH)
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM qa_cache")
        total = cur.fetchone()[0]
        cur.execute("SELECT MIN(created_at), MAX(created_at) FROM qa_cache")
        row = cur.fetchone()
        min_ts, max_ts = row if row else (None, None)
        to_iso = lambda ts: datetime.fromtimestamp(ts).isoformat() if ts else None
        return {"entries": total, "oldest": to_iso(min_ts), "newest": to_iso(max_ts), "ttl_seconds": CACHE_TTL_SECONDS}
    finally:
        conn.close()

# =========================
# Caché de metadatos (id -> filename)
# =========================
FILE_META: Dict[str, str] = {}

def load_file_meta_cache() -> Dict[str, str]:
    if os.path.exists(FILE_META_CACHE_PATH):
        try:
            with open(FILE_META_CACHE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_file_meta_cache(cache: Dict[str, str]):
    with open(FILE_META_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def fetch_filename(file_id: Optional[str]) -> str:
    if not file_id:
        return "desconocido"
    try:
        data = http_get(f"/files/{file_id}")
        return data.get("filename") or file_id
    except Exception:
        return file_id or "desconocido"

def ensure_file_meta(file_ids: List[str]):
    global FILE_META
    FILE_META.update(load_file_meta_cache())
    missing = [fid for fid in file_ids if fid not in FILE_META]
    for fid in missing:
        FILE_META[fid] = fetch_filename(fid)
    save_file_meta_cache(FILE_META)

# =========================
# Vector Store helpers (HTTP)
# =========================
def _save_vs_id(vs_id: str):
    with open(VS_PATH, "w", encoding="utf-8") as f:
        f.write(vs_id)

def _load_vs_id() -> Optional[str]:
    if os.path.exists(VS_PATH):
        with open(VS_PATH, "r", encoding="utf-8") as f:
            return f.read().strip() or None
    return None

def load_vs_id() -> Optional[str]:
    """Obtener Vector Store ID desde el archivo de caché (público)"""
    return _load_vs_id()

def _create_vs(name: str) -> str:
    vs = http_post("/vector_stores", {"name": name})
    vs_id = vs["id"]
    _save_vs_id(vs_id)
    return vs_id

def _validate_vs(vs_id: str) -> bool:
    try:
        http_get(f"/vector_stores/{vs_id}")
        return True
    except RuntimeError as e:
        msg = str(e)
        if "No valid vector store found" in msg or "404" in msg:
            return False
        raise

def get_or_create_vector_store(name: str) -> str:
    # 1) Forzar uno nuevo si así se indica
    if FORCE_NEW_VECTOR_STORE:
        return _create_vs(name)

    # 2) Preferir ID desde variable de entorno si está definido y es válido
    env_vs = os.environ.get("OPENAI_VECTOR_STORE_ID")
    if env_vs:
        try:
            if _validate_vs(env_vs):
                # Guardar también en archivo para visibilidad/diagnóstico
                _save_vs_id(env_vs)
                return env_vs
        except Exception:
            # Si falla la validación del env, continuar con las otras rutas
            logger.warning("OPENAI_VECTOR_STORE_ID inválido o no accesible; se intentará con caché de archivo o creación.")

    # 3) Usar el ID cacheado en archivo si existe y es válido
    cached = _load_vs_id()
    if cached and _validate_vs(cached):
        return cached

    # 4) Crear uno nuevo como último recurso
    return _create_vs(name)

def list_vector_store_file_ids(vs_id: str) -> List[str]:
    out = []
    params = {"limit": 100}
    while True:
        data = http_get(f"/vector_stores/{vs_id}/files", params=params)
        for item in data.get("data", []):
            out.append(item.get("id") or item.get("file_id"))
        if not data.get("has_more"):
            break
        params["after"] = data.get("last_id")
    return out

def attach_files_batch(vs_id: str, file_ids: List[str]) -> Dict[str, Any]:
    if not file_ids:
        return {"added": [], "skipped": 0, "status": "completed"}
    batch = http_post(f"/vector_stores/{vs_id}/file_batches", {"file_ids": file_ids})
    batch_id = batch["id"]
    sleep_s = 0.75
    while True:
        info = http_get(f"/vector_stores/{vs_id}/file_batches/{batch_id}")
        status = info.get("status")
        if status in ("completed", "failed", "cancelled"):
            return {
                "added": file_ids if status == "completed" else [],
                "skipped": 0,
                "status": status,
                "file_counts": info.get("file_counts", {})
            }
        time.sleep(sleep_s)
        sleep_s = min(sleep_s * 1.5, 5.0)

def sync_vector_store_files(vs_id: str, desired_file_ids: List[str]) -> Dict[str, Any]:
    try:
        current = set(list_vector_store_file_ids(vs_id))
    except RuntimeError as e:
        if "No valid vector store found" in str(e) or "404" in str(e):
            vs_id = _create_vs(VS_NAME)
            current = set(list_vector_store_file_ids(vs_id))
        else:
            raise
    missing = [fid for fid in desired_file_ids if fid not in current]
    res = attach_files_batch(vs_id, missing)
    res["skipped"] = len(desired_file_ids) - len(missing)
    res["vs_id"] = vs_id
    return res

# =========================
# Responses API (file_search + vector_store_ids) + PARSER
# =========================
def responses_create(body: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return http_post("/responses", body)
    except RuntimeError as e:
        msg = str(e)
        removed = False
        if "temperature" in msg and "Unsupported parameter" in msg:
            body.pop("temperature", None)
            removed = True
        if "parallel_tool_calls" in msg and "Unsupported parameter" in msg:
            body.pop("parallel_tool_calls", None)
            removed = True
        if "reasoning" in msg and "Unsupported parameter" in msg:
            body.pop("reasoning", None)
            removed = True
        if removed:
            return http_post("/responses", body)
        raise

def _join_output_text(resp_json: Dict[str, Any]) -> str:
    t = resp_json.get("output_text")
    if t:
        return t
    pieces = []
    for item in (resp_json.get("output") or []):
        for block in item.get("content", []):
            if isinstance(block, dict):
                txt = block.get("text")
                if txt:
                    pieces.append(txt)
    if pieces:
        return "\n".join(pieces)
    for ch in (resp_json.get("choices") or []):
        msg = (ch.get("message") or {})
        content = msg.get("content")
        if isinstance(content, str) and content.strip():
            return content
        if isinstance(content, list):
            for c in content:
                if isinstance(c, dict) and c.get("type") in ("text", "output_text") and c.get("text"):
                    pieces.append(c["text"])
    return "\n".join(pieces).strip()

def _collect_finish_reasons(resp_json: Dict[str, Any]) -> List[str]:
    reasons = []
    # Responses: a veces hay finish_reason por bloque
    for item in (resp_json.get("output") or []):
        fr = item.get("finish_reason")
        if fr:
            reasons.append(fr)
    # Chat-style fallback
    for ch in (resp_json.get("choices") or []):
        fr = ch.get("finish_reason")
        if fr:
            reasons.append(fr)
    return reasons

def _extract_usage(resp_json: Dict[str, Any]) -> Dict[str, Any]:
    return resp_json.get("usage") or {}

def extract_output_and_citations(resp_json: Dict[str, Any]) -> Tuple[str, List[Dict[str, Any]], Dict[str, Any]]:
    text = _join_output_text(resp_json)
    cites: List[Dict[str, Any]] = []
    try:
        for item in (resp_json.get("output") or []):
            for block in item.get("content", []):
                anns = (block.get("annotations") or []) if isinstance(block, dict) else []
                for ann in anns:
                    if ann.get("type") == "file_citation":
                        fc = ann.get("file_citation", {}) or {}
                        fid = fc.get("file_id") or fc.get("id") or None
                        marker = ann.get("text", "")
                        fname = FILE_META.get(fid, fetch_filename(fid))
                        cites.append({"marker": marker or "", "file_id": fid, "file": fname})
    except Exception:
        pass
    meta = {
        "finish_reasons": _collect_finish_reasons(resp_json),
        "usage": _extract_usage(resp_json),
        "raw": resp_json
    }
    return text, cites, meta

def _looks_truncated(text: str, meta: Dict[str, Any], max_output_tokens: int) -> bool:
    if END_SENT in text:
        return False
    if CONT_SENT in text:
        return True
    reasons = set(meta.get("finish_reasons") or [])
    if "length" in reasons:
        return True
    usage = meta.get("usage") or {}
    out_tokens = usage.get("output_tokens")
    if isinstance(out_tokens, int) and out_tokens >= max_output_tokens - 5:
        return True
    return False

def _strip_markers(s: str) -> str:
    return s.replace(END_SENT, "").replace(CONT_SENT, "").strip()

def call_openai_once(prompt_text: str, vs_id: str, max_output_tokens: int) -> Tuple[str, List[Dict[str, Any]], Dict[str, Any]]:
    body = {
        "model": MODEL,
        "input": [{
            "role": "user",
            "content": [{"type": "input_text", "text": prompt_text}]
        }],
        "tools": [{"type": "file_search", "vector_store_ids": [vs_id]}],
        "reasoning": {"effort": REASONING_EFFORT},
        "max_output_tokens": max_output_tokens,
        "instructions": ASSISTANT_INSTRUCTIONS,
    }
    resp_json = responses_create(body)
    text, cites, meta = extract_output_and_citations(resp_json)
    if not text or not text.strip():
        logger.warning(f"Respuesta vacía de OpenAI para prompt: {prompt_text[:100]}...")
        text = ("Lo siento, no encuentro instrucciones para ese tema en el manual. "
                "Por favor, formula tu duda con términos del manual o revisa el índice.")
    return text, cites, meta

def call_openai_autocontinue(question: str, vs_id: str, max_output_tokens: int) -> Tuple[str, List[Dict[str, Any]]]:
    # 1ª pasada
    full_text, all_cites, parts = "", [], 0
    t, c, m = call_openai_once(question, vs_id, max_output_tokens)
    full_text += _strip_markers(t)
    all_cites.extend(c)
    parts += 1

    # Continuaciones si fue truncado
    while _looks_truncated(t, m, max_output_tokens) and parts <= MAX_CONTINUATIONS:
        cont_prompt = (
            "CONTINÚA EXACTAMENTE desde donde te quedaste, sin repetir texto previo. "
            "Mantén el formato en pasos y la numeración. "
            f"Termina con '{END_SENT}' si alcanzas a concluir, "
            f"si no, termina con '{CONT_SENT}'.\n\n"
            f"Pregunta original: {question}"
        )
        t, c, m = call_openai_once(cont_prompt, vs_id, max_output_tokens)
        full_text += "\n" + _strip_markers(t)
        all_cites.extend(c)
        parts += 1

    # Limpieza final de sentinelas por si quedaron
    full_text = _strip_markers(full_text)
    # Dejar único por (file_id, file)
    seen = set()
    merged = []
    for ci in all_cites:
        key = (ci.get("file_id"), ci.get("file"))
        if key not in seen:
            seen.add(key)
            merged.append(ci)
    return full_text.strip(), merged

# =========================
# Capa de comodidad con caché
# =========================
def ask_with_cache(question: str,
                   vs_id: str,
                   file_ids: List[str],
                   use_cache: bool = True,
                   max_output_tokens: Optional[int] = None) -> Dict[str, Any]:
    max_out = max_output_tokens or MAX_OUTPUT_TOKENS
    key = make_cache_key(
        question=question,
        file_ids=file_ids,
        model=MODEL,
        reasoning_effort=REASONING_EFFORT,
        max_output_tokens=max_out,
        instructions=ASSISTANT_INSTRUCTIONS
    )
    if use_cache:
        cached = get_cached_answer(key)
        if cached:
            answer, sources = cached
            logger.info(f"Respuesta recuperada del cache para pregunta: {question[:100]}...")
            return {"answer": answer, "sources": sources, "cached": True}

    answer, sources = call_openai_autocontinue(question, vs_id=vs_id, max_output_tokens=max_out)
    put_cached_answer(key, answer, sources)
    logger.info(f"Respuesta generada nueva para pregunta: {question[:100]}...")
    return {"answer": answer, "sources": sources, "cached": False}

# =========================
# Clase OpenAIService (compatibilidad con código existente)
# =========================
class OpenAIService:
    """Servicio para manejar las interacciones con OpenAI usando HTTP puro"""
    
    def __init__(self):
        logger.info("=== INICIALIZANDO OpenAIService (HTTP puro) ===")
        
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY no está configurada en las variables de entorno")
        
        if not TARGET_FILE_IDS:
            logger.warning("No hay archivos configurados en OPENAI_FILE_IDS")
        
        # Inicializar SQLite
        init_sqlite()
        purge_empty_cache()
        
        # Cargar metadatos de archivos
        ensure_file_meta(TARGET_FILE_IDS)
        
        # Obtener/crear Vector Store
        self.vector_store_id = get_or_create_vector_store(VS_NAME)
        
        # Sincronizar archivos
        sync_info = sync_vector_store_files(self.vector_store_id, TARGET_FILE_IDS)
        self.vector_store_id = sync_info.get("vs_id", self.vector_store_id)
        
        logger.info(f"Vector Store: {self.vector_store_id}")
        logger.info(f"Archivos rastreados: {len(TARGET_FILE_IDS)}")
        logger.info(f"Caché (SQLite): {cache_stats()}")
        
    def ask_question(self, question: str, max_output_tokens: int = 800) -> Tuple[str, List[Dict]]:
        """
        Hacer una pregunta al modelo con cache de respuestas y auto-continue.
        
        Args:
            question: Pregunta del usuario
            max_output_tokens: Número máximo de tokens por llamada (default: 800)
            
        Returns:
            Tuple[str, List[Dict]]: (respuesta, fuentes)
        """
        result = ask_with_cache(
            question=question,
            vs_id=self.vector_store_id,
            file_ids=TARGET_FILE_IDS,
            use_cache=True,
            max_output_tokens=max_output_tokens
        )
        
        return result["answer"], result["sources"]


# Instancia global del servicio (inicialización lazy)
_openai_service_instance = None

def get_openai_service() -> OpenAIService:
    """Obtener instancia singleton del servicio"""
    global _openai_service_instance
    if _openai_service_instance is None:
        _openai_service_instance = OpenAIService()
    return _openai_service_instance

# Para compatibilidad con código existente - inicialización lazy
class OpenAIServiceProxy:
    """Proxy para acceso lazy a OpenAIService"""
    def ask_question(self, question: str, max_output_tokens: int = 800) -> Tuple[str, List[Dict]]:
        service = get_openai_service()
        return service.ask_question(question, max_output_tokens)

# Instancia proxy (compatibilidad con código existente)
openai_service = OpenAIServiceProxy()

# Intentar inicializar al importar el módulo si hay configuración
if OPENAI_API_KEY and TARGET_FILE_IDS:
    try:
        _openai_service_instance = OpenAIService()
        # Reemplazar proxy con instancia real
        openai_service = _openai_service_instance
        logger.info("=== OpenAIService inicializado correctamente ===")
    except Exception as e:
        logger.error(f"Error inicializando OpenAIService: {str(e)}")
        _openai_service_instance = None
else:
    logger.warning("OpenAIService no inicializado: faltan OPENAI_API_KEY o OPENAI_FILE_IDS")
